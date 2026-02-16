import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { PredictionItem } from "@/lib/database.types";
import { unstable_cache } from "next/cache";

// Cache the metrics calculation
// This will be invalidated by revalidateTag('model-metrics')
const getMetrics = unstable_cache(
  async () => {
     if (!supabaseAdmin) {
        throw new Error("Admin database access not configured");
     }

      // Fetch all predictions
      // Optimize: Only fetch necessary columns? 
      // Currently logic needs full predictions array to calc average chance
    const { data: predictions, error } = await supabaseAdmin
      .from("predictions")
      .select("model, predictions");

    if (error) {
      throw new Error(`Failed to fetch predictions: ${error.message}`);
    }

    // Process metrics
    const metrics: Record<
      string,
      { totalPredictions: number; totalChance: number; count: number }
    > = {};

    // Initialize for all known models
    const knownModels = ["grok", "claude", "gpt", "gemini"];
    knownModels.forEach((model) => {
      metrics[model] = { totalPredictions: 0, totalChance: 0, count: 0 };
    });

    if (predictions) {
      predictions.forEach((row: { model: string; predictions: PredictionItem[] }) => {
        const modelKey = row.model.toLowerCase();
        if (!metrics[modelKey]) {
             metrics[modelKey] = { totalPredictions: 0, totalChance: 0, count: 0 };
        }
        
        const items = row.predictions || [];
        metrics[modelKey].totalPredictions += items.length;
        
        items.forEach((item) => {
            metrics[modelKey].totalChance += item.chance;
            metrics[modelKey].count += 1;
        });
      });
    }

    // Format output
    return Object.entries(metrics).map(([model, data]) => {
      const avgChance =
        data.count > 0 ? Math.round(data.totalChance / data.count) : 0;
      return {
        model,
        totalPredictions: data.totalPredictions,
        averageChance: avgChance,
      };
    });
  },
  ['model-metrics-calculation'], // Cache key
  { 
    tags: ['model-metrics'], // Cache tag for invalidation
    revalidate: 3600 // Fallback revalidation (1 hour) just in case
  }
);

export async function GET() {
  try {
    const result = await getMetrics();
    return NextResponse.json({ metrics: result });
  } catch (error) {
    console.error("Error in /api/models/metrics:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
