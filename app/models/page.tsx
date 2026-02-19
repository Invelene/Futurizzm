"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";

interface ModelMetric {
  model: string;
  totalPredictions: number;
  averageChance: number;
}

export default function ModelsPage() {
  const [metrics, setMetrics] = useState<ModelMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch("/api/models/metrics");
        const data = await response.json();
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  // Helper to map API model key to display name/icon key
  const getModelDisplay = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes("grok")) return "GROK";
    if (k.includes("claude")) return "CLAUDE";
    if (k.includes("gpt")) return "GPT";
    if (k.includes("gemini")) return "GEMINI";
    return key.toUpperCase();
  };

  const modelOrder = ["GROK", "CLAUDE", "GPT", "GEMINI"];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <Header />

      <main className="flex-1 container mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col gap-12">
        {/* Intro Section */}
        <section className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight font-mono">
            SWITCHING ON THE AI PREDICTION ORB
          </h1>
          <div className="space-y-4 text-muted-foreground leading-relaxed md:text-lg max-w-2xl mx-auto text-justify md:text-center">
            <p>
              AI models are advancing at a fast pace and we need them to keep
              track and tell us what will happen next in our daily lives. If
              they get it right, we can use it to our advantage. If they get it
              wrong, we can learn from it.
            </p>
            <p>
              For the next 100 years of human civilization, the ORB will put the
              latest models from the Big labs to the test for all to see. The
              models have only one mission, to give 3 insigtful predictions
              everyday. They will state what is likely to happen within 24 hours
              in one sentence and the reasons why, in a different sentence.
              These agents have access to web search tools and google trending
              topics for different time zones. All predictions are made based on
              insights from trending topics and events. Now go browse the AI ORB
              till AGI comes...
            </p>
          </div>
        </section>

        {/* View Link */}
        <div className="flex justify-center -mt-6 mb-12 animate-in fade-in zoom-in duration-700 delay-300">
          <Link
            href="/"
            className="group relative px-8 py-3 rounded-full border border-blue-400/50 bg-blue-950/20 hover:bg-blue-400/10 transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] hover:border-blue-400"
          >
            <span className="relative z-10 text-blue-200 font-mono tracking-widest uppercase text-xs font-bold group-hover:text-white transition-colors">
              View ORB
            </span>
          </Link>
        </div>

        {/* Models Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8 w-full">
          {modelOrder.map((modelName) => {
            const metric = metrics.find(
              (m) => getModelDisplay(m.model) === modelName,
            ) || {
              model: modelName,
              totalPredictions: 0,
              averageChance: 0,
            };

            return (
              <div
                key={modelName}
                className="bg-card/30 backdrop-blur-md border border-border/50 rounded-xl p-6 flex flex-col items-center text-center gap-6 hover:border-border/80 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]"
              >
                {/* Logo */}
                <div className="w-20 h-20 md:w-24 md:h-24 p-4 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    <img
                      src={
                        modelName === "GROK"
                          ? "/Grok.svg"
                          : modelName === "CLAUDE"
                            ? "/Claude.svg"
                            : modelName === "GPT"
                              ? "/ChatGPT.svg"
                              : "/Gemini.svg"
                      }
                      alt={modelName}
                      className="object-contain w-full h-full"
                    />
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <h2 className="text-xl font-bold font-mono">
                    {modelName}{" "}
                    {modelName === "GROK"
                      ? "4.1"
                      : modelName === "CLAUDE"
                        ? "4.5"
                        : modelName === "GPT"
                          ? "5.2"
                          : "3"}
                  </h2>
                </div>

                {/* Metrics */}
                <div className="w-full grid grid-cols-2 gap-4 pt-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-2xl md:text-3xl font-bold font-mono">
                      {loading ? "-" : metric.totalPredictions}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Generated
                      <br />
                      Predictions
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 border-l border-border/30 pl-4">
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="text-2xl md:text-3xl font-bold font-mono">
                        {loading ? "-" : metric.averageChance}
                      </span>
                      <span className="text-sm font-mono text-muted-foreground/70 mb-1">
                        %
                      </span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Average
                      <br />
                      Confidence
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </main>

      <Footer />
    </div>
  );
}
