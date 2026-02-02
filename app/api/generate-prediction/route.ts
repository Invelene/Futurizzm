import { generateObject } from "ai"
import { z } from "zod"
import { supabase } from "@/lib/supabase"
import { MODEL_CONFIG, type PredictionItem } from "@/lib/database.types"
import { getTrendingCategories, type TrendingCategory } from "@/lib/trends"
import { getPredictionDate } from "@/lib/time-utils"
// Provider-specific imports for web search
import { anthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"
import { google } from "@ai-sdk/google"

const predictionSchema = z.object({
  predictions: z
    .array(
      z.object({
        title: z.string().describe("3-4 word headline-style title"),
        chance: z.number().min(0).max(100).describe("Percentage chance (0-100) this prediction will happen today"),
        content: z.string().describe("25-30 words: First sentence = what will happen. Next 1-2 sentences = overlooked signals/reasons."),
      }),
    )
    .length(3),
})

// Comprehensive fallback categories if Google Trends fails
const FALLBACK_CATEGORIES: TrendingCategory[] = [
  // Original 4
  { name: 'Politics', topics: ['Government Policy', 'Election Update', 'Congress Action'] },
  { name: 'Sports', topics: ['Game Preview', 'Player Trade', 'League News'] },
  { name: 'Business', topics: ['Market Open', 'Tech Earnings', 'Fed Decision'] },
  { name: 'Science', topics: ['Space Launch', 'AI Breakthrough', 'Climate Report'] },
  // Technology
  { name: 'Technology', topics: ['Product Launch', 'Software Update', 'Cybersecurity Threat'] },
  { name: 'AI & Machine Learning', topics: ['Model Release', 'Regulation News', 'Industry Adoption'] },
  { name: 'Cryptocurrency', topics: ['Bitcoin Movement', 'Altcoin Rally', 'Regulatory Shift'] },
  { name: 'Social Media', topics: ['Platform Update', 'Viral Trend', 'Creator Economy'] },
  // Finance
  { name: 'Stock Market', topics: ['Index Movement', 'Sector Rotation', 'Options Expiry'] },
  { name: 'Real Estate', topics: ['Housing Data', 'Mortgage Rates', 'Commercial Trends'] },
  { name: 'Banking', topics: ['Interest Rates', 'Lending Trends', 'Bank Earnings'] },
  { name: 'Commodities', topics: ['Oil Prices', 'Gold Movement', 'Agricultural Futures'] },
  // Entertainment
  { name: 'Entertainment', topics: ['Movie Release', 'Award Show', 'Celebrity News'] },
  { name: 'Gaming', topics: ['Game Launch', 'Esports Tournament', 'Console Update'] },
  { name: 'Music', topics: ['Album Drop', 'Tour Announcement', 'Streaming Records'] },
  { name: 'Streaming', topics: ['New Series', 'Subscriber Growth', 'Platform Wars'] },
  // Health & Wellness
  { name: 'Healthcare', topics: ['Drug Approval', 'Hospital News', 'Insurance Policy'] },
  { name: 'Fitness', topics: ['Workout Trends', 'Supplement News', 'Athlete Performance'] },
  { name: 'Mental Health', topics: ['Awareness Campaign', 'Treatment Innovation', 'Workplace Wellness'] },
  { name: 'Nutrition', topics: ['Diet Trends', 'Food Safety', 'Supplement Research'] },
  // Environment
  { name: 'Climate', topics: ['Weather Event', 'Policy Change', 'Sustainability Report'] },
  { name: 'Energy', topics: ['Oil Production', 'Renewable Growth', 'Grid Update'] },
  { name: 'Environment', topics: ['Conservation Effort', 'Pollution Report', 'Wildlife News'] },
  // Society
  { name: 'Education', topics: ['School Policy', 'Test Results', 'University News'] },
  { name: 'Crime', topics: ['Investigation Update', 'Court Ruling', 'Policy Change'] },
  { name: 'Transportation', topics: ['Traffic Update', 'Transit News', 'Aviation Trend'] },
  { name: 'Housing', topics: ['Rent Trends', 'Construction Data', 'Urban Development'] },
  // Global
  { name: 'World News', topics: ['Diplomatic Meeting', 'Trade Deal', 'Conflict Update'] },
  { name: 'Asia Pacific', topics: ['China Markets', 'Japan Policy', 'Regional Trade'] },
  { name: 'Europe', topics: ['EU Decision', 'Brexit Impact', 'Economic Data'] },
  { name: 'Middle East', topics: ['Oil News', 'Regional Politics', 'Economic Reform'] },
  // Emerging
  { name: 'Space', topics: ['Satellite Launch', 'NASA Update', 'Private Venture'] },
  { name: 'Biotech', topics: ['Clinical Trial', 'Gene Therapy', 'FDA Decision'] },
  { name: 'Robotics', topics: ['Industrial Deployment', 'Consumer Product', 'Automation Trend'] },
  { name: 'Quantum Computing', topics: ['Research Breakthrough', 'Industry Application', 'Investment News'] },
]

// Shuffle array for random category selection
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Get 4 random fallback categories
function getRandomFallbacks(): TrendingCategory[] {
  return shuffleArray(FALLBACK_CATEGORIES).slice(0, 4)
}

// POST: Generate for specific model (used by frontend)
// GET: Generate all predictions (used by cron)
export async function POST(req: Request) {
  const { category, topics, modelKey } = await req.json()
  return generateForModel(modelKey, category, topics)
}

export async function GET(req: Request) {
  // Cron endpoint - generate predictions for all models
  const { searchParams } = new URL(req.url)
  const cronSecret = searchParams.get('secret')

  // Optional: verify cron secret for security
  // if (cronSecret !== process.env.CRON_SECRET) {
  //   return Response.json({ error: 'Unauthorized' }, { status: 401 })
  // }

  // Fetch trending categories from Google Trends
  let categories: TrendingCategory[]
  let usingFallback = false
  try {
    categories = await getTrendingCategories()
    console.log('Fetched Google Trends categories:', categories.map(c => c.name))
  } catch (error) {
    console.error('Failed to fetch Google Trends, using random fallback:', error)
    categories = getRandomFallbacks()
    usingFallback = true
  }

  const modelKeys = ['grok', 'claude', 'gpt', 'gemini'] as const
  const results = []

  for (let i = 0; i < 4; i++) {
    const modelKey = modelKeys[i]
    const category = categories[i] || getRandomFallbacks()[0]

    try {
      const response = await generateForModel(modelKey, category.name, category.topics)
      const data = await response.json()
      results.push({ model: modelKey, category: category.name, status: 'success', data })
    } catch (error) {
      results.push({ model: modelKey, category: category.name, status: 'error', error: String(error) })
    }
  }

  return Response.json({
    date: new Date().toISOString().split('T')[0],
    trendSource: usingFallback ? 'fallback' : 'google-trends',
    results
  })
}

async function generateForModel(
  modelKey: keyof typeof MODEL_CONFIG,
  category: string,
  topics: string[]
) {
  const modelConfig = MODEL_CONFIG[modelKey]
  if (!modelConfig) {
    return Response.json({ error: "Invalid modelKey" }, { status: 400 })
  }

  const topicsList = topics.map((t, i) => `${i + 1}. ${t}`).join('\n')

  // Get the current Pacific date for predictions
  const predictionDate = getPredictionDate()

  const prompt = `You are Futurizzm, an AI prediction system with real-time web search access.

Date: ${predictionDate}
Category: ${category}
Topics to predict on:
${topicsList}

Your task: Using real-time web search, predict what is LIKELY TO HAPPEN on ${predictionDate} for each topic.

CONTEXT:
- It is currently 5:00 AM Pacific Time on ${predictionDate}
- You have access to the latest news, trends, and insights 
- Don't make predictions on things that are scheduled or has obvious outcomes
- Don't make predictions on things that are too far in the future
- Always choose insightful and thought-provoking predictions
- Focus on events expected to unfold during ${predictionDate}

FORMAT RULES:
- Title: 3-4 words only, headline style (e.g., "Market Rally Expected")
- Chance: 0-100 percentage likelihood
- Content: 25-30 words total
  - First sentence: What will happen
  - Next 1-2 sentences: Overlooked signals/reasons the general public might miss

Be specific with times, numbers, and sources. Ground your predictions in current events.`

  try {
    // Configure provider-specific web search tools
    let modelOptions: Record<string, unknown> = { model: modelConfig.id }
    let tools: Record<string, unknown> = {}

    switch (modelKey) {
      case 'claude':
        // Anthropic web search tool
        tools = {
          web_search: anthropic.tools.webSearch_20250305({
            maxUses: 5,
            userLocation: {
              type: 'approximate',
              country: 'US',
              region: 'California',
              city: 'San Francisco',
              timezone: 'America/Los_Angeles',
            },
          }),
        }
        break
      case 'gpt':
        // OpenAI web search tool
        tools = {
          web_search: openai.tools.webSearch({}),
        }
        break
      case 'gemini':
        // Google Gemini with Google Search tool
        modelOptions = { model: google('gemini-3-pro') }
        tools = {
          google_search: google.tools.googleSearch({}),
        }
        break
      case 'grok':
        // xAI Grok - uses searchParameters in providerOptions
        modelOptions = {
          model: modelConfig.id,
          providerOptions: {
            xai: {
              searchParameters: {
                mode: 'auto',
                returnCitations: true,
                fromDate: predictionDate,
                toDate: predictionDate,
              }
            }
          }
        }
        break
    }

    // Build options object conditionally
    const providerOpts = modelOptions.providerOptions as Record<string, unknown> | undefined

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generateOptions: any = {
      model: modelOptions.model || modelConfig.id,
      schema: predictionSchema,
      prompt,
      maxOutputTokens: 1000,
    }

    if (providerOpts) {
      generateOptions.providerOptions = providerOpts
    }

    if (Object.keys(tools).length > 0) {
      generateOptions.tools = tools
    }

    const { object } = await generateObject(generateOptions)

    // Cast to expected type
    const result = object as { predictions: Array<{ title: string; chance: number; content: string }> }

    // Add color based on chance percentage
    const predictionsWithColor: PredictionItem[] = result.predictions.map((p) => ({
      title: p.title,
      chance: p.chance,
      chanceColor: p.chance >= 50 ? '#22c55e' : '#ef4444',
      content: p.content,
    }))

    // Store in Supabase (only if configured)
    if (supabase) {
      const { error: dbError } = await supabase.from('predictions').upsert({
        date: predictionDate,
        model: modelKey,
        category: category,
        predictions: predictionsWithColor,
      }, {
        onConflict: 'date,model,category',
      })

      if (dbError) {
        console.error('Supabase insert error:', dbError)
      }
    }

    return Response.json({ predictions: predictionsWithColor })
  } catch (error) {
    console.error("Error generating prediction:", error)
    return Response.json({ error: "Failed to generate prediction" }, { status: 500 })
  }
}
