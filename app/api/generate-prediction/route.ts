import { generateText } from "ai"
import { z } from "zod"
import { supabase } from "@/lib/supabase"
import { MODEL_CONFIG, type PredictionItem } from "@/lib/database.types"
import { getTrendingCategories, type TrendingCategory } from "@/lib/trends"
import { getPredictionDate } from "@/lib/time-utils"
// Provider-specific imports for web search tools
import { anthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"
import { google } from "@ai-sdk/google"

const predictionSchema = z.object({
  category: z.string().describe("1-2 word theme that captures the overall tone of all 3 predictions below (e.g., 'Tech Surge', 'Market Shift', 'Policy Storm', 'Breaking News')"),
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

// Model keys for iteration
const MODEL_KEYS = ['grok', 'claude', 'gpt', 'gemini'] as const
type ModelKey = typeof MODEL_KEYS[number]

// Verify predictions exist in database for today and retry missing models
async function verifyAndRetryPredictions(
  predictionDate: string,
  categories: TrendingCategory[],
  maxRetries: number = 3
): Promise<{ verified: ModelKey[], retried: ModelKey[], failed: ModelKey[] }> {
  const verified: ModelKey[] = []
  const retried: ModelKey[] = []
  const failed: ModelKey[] = []
  
  if (!supabase) {
    console.error('Supabase not configured, skipping verification')
    return { verified: MODEL_KEYS.slice() as unknown as ModelKey[], retried, failed }
  }
  
  // Check which models have predictions for today
  const { data: existingPredictions, error } = await supabase
    .from('predictions')
    .select('model')
    .eq('date', predictionDate)
  
  if (error) {
    console.error('Error fetching predictions for verification:', error)
    return { verified: [], retried: [], failed: MODEL_KEYS.slice() as unknown as ModelKey[] }
  }
  
  const existingModels = new Set(existingPredictions?.map(p => p.model) || [])
  const missingModels = MODEL_KEYS.filter(model => !existingModels.has(model))
  
  // Mark existing ones as verified
  MODEL_KEYS.forEach(model => {
    if (existingModels.has(model)) {
      verified.push(model)
    }
  })
  
  console.log(`Verification: ${verified.length}/4 models have predictions. Missing: ${missingModels.join(', ') || 'none'}`)
  
  // Retry missing models
  for (const modelKey of missingModels) {
    let success = false
    const modelIndex = MODEL_KEYS.indexOf(modelKey)
    const category = categories[modelIndex] || getRandomFallbacks()[0]
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Retry attempt ${attempt}/${maxRetries} for ${modelKey}...`)
      
      try {
        const response = await generateForModel(modelKey, category.name, category.topics)
        const data = await response.json()
        
        if (!data.error && data.predictions && data.predictions.length > 0) {
          console.log(`✓ ${modelKey} succeeded on attempt ${attempt}`)
          retried.push(modelKey)
          success = true
          break
        } else {
          console.error(`× ${modelKey} returned invalid data on attempt ${attempt}:`, data.error || 'No predictions')
        }
      } catch (err) {
        console.error(`× ${modelKey} failed on attempt ${attempt}:`, err)
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
      }
    }
    
    if (!success) {
      console.error(`✗ ${modelKey} failed all ${maxRetries} retry attempts`)
      failed.push(modelKey)
    }
  }
  
  return { verified, retried, failed }
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

  // Get the prediction date (tomorrow in EST)
  const predictionDate = getPredictionDate()
  console.log(`Generating predictions for date: ${predictionDate}`)

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

  const results: { model: string, category: string, status: string, data?: unknown, error?: string }[] = []

  // Initial generation for all models
  for (let i = 0; i < 4; i++) {
    const modelKey = MODEL_KEYS[i]
    const category = categories[i] || getRandomFallbacks()[0]

    try {
      const response = await generateForModel(modelKey, category.name, category.topics)
      const data = await response.json()
      results.push({ model: modelKey, category: category.name, status: 'success', data })
    } catch (error) {
      results.push({ model: modelKey, category: category.name, status: 'error', error: String(error) })
    }
  }

  // Verify all models have predictions and retry any that failed
  console.log('Starting verification phase...')
  const verification = await verifyAndRetryPredictions(predictionDate, categories, 3)
  
  const successCount = verification.verified.length + verification.retried.length
  const allSucceeded = successCount === 4

  return Response.json({
    date: predictionDate,
    trendSource: usingFallback ? 'fallback' : 'google-trends',
    results,
    verification: {
      verified: verification.verified,
      retried: verification.retried,
      failed: verification.failed,
      allModelsSucceeded: allSucceeded,
      summary: `${successCount}/4 models have predictions`
    }
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

  const prompt = `YOU ARE A JSON API. Output ONLY valid JSON. No explanations, no markdown, no prose.

You are Futurizzm, an AI prediction system with real-time web search access.

Date: ${predictionDate}
Category: ${category}
Topics: ${topicsList}

Task: Use web search to predict what is LIKELY TO HAPPEN on ${predictionDate} for each topic.

RULES:
- It is currently 5:00 AM Pacific Time on ${predictionDate}
- First sentence will be the prediction (use the word "will" when necessary), second or third sentences will be the reasons the prediction is likely to happen
- Don't predict scheduled events or obvious outcomes
- Don't predict events that are too far in the future
- When working on predictions, pick up on signals or overlooked reasons that could lead to unexpected outcomes or events
- Be insightful and initiative
- Try to become good at predicting the future
- Be exact, Call names of persons, events, things, activities, or places
- Prioritize insightful details
- You are allowed to use web search to find information to help make predictions
- Don't repeat the words "overlooked signals" or other words in these rules in your responses
- Trending topics are information clues for you to tactically deduce nuances for predictions that are not obvious or predictable
- Lastly, ground your predictions in reality and avoid making outlandish claims
- All predictions must be for the date ${predictionDate}

PREDICTION FORMAT:
- Title: 3-4 words headline style
- Chance: 0-100 percentage
- Content: 25-30 words (Adhere strictly to the rules given above)

OUTPUT: Respond with ONLY this JSON structure, nothing else:
{
  "category": "1-2 word theme (e.g., 'Tech Surge', 'Policy Storm'), capture the",
  "predictions": [
    {"title": "3-4 word headline", "chance": 75, "content": "25-30 words..."},
    {"title": "3-4 word headline", "chance": 60, "content": "25-30 words..."},
    {"title": "3-4 word headline", "chance": 45, "content": "25-30 words..."}
  ]
}

CRITICAL: Do NOT write any text before or after the JSON. No "Based on my research..." No explanations. ONLY the JSON object.`

  try {
    // Configure provider-specific web search tools
    let modelOptions: Record<string, unknown> = { model: modelConfig.id }
    let tools: Record<string, unknown> = {}

    // Configure web search tools based on model
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
        // Google Search grounding for Gemini
        tools = {
          google_search: google.tools.googleSearch({}),
        }
        break
      case 'grok':
        // xAI Grok - uses searchParameters in providerOptions (built-in search)
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
      prompt,
      system: "You are a strict JSON generator. You MUST return exactly 3 items in the 'predictions' array. No more, no less.",
      maxTokens: 1500,
    }

    if (providerOpts) {
      generateOptions.providerOptions = providerOpts
    }

    if (Object.keys(tools).length > 0) {
      generateOptions.tools = tools
      generateOptions.maxSteps = 5 // Allow tool execution before final response
    }

    const { text } = await generateText(generateOptions)

    if (!text || text.trim().length === 0) {
      throw new Error(`Model returned empty text. Check that web search tools are configured correctly.`)
    }

    // Parse JSON from text response, handling potential markdown code blocks
    let jsonText = text.trim()
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7)
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3)
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3)
    }
    jsonText = jsonText.trim()

    // Parse and validate with Zod schema
    const parsed = JSON.parse(jsonText)
    const validatedResult = predictionSchema.parse(parsed)

    // Use the AI-generated category that reflects the tone of all predictions
    const aiGeneratedCategory = validatedResult.category || category

    // Add color based on chance percentage
    const predictionsWithColor: PredictionItem[] = validatedResult.predictions.map((p) => ({
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
        category: aiGeneratedCategory, // Use AI-generated category
        predictions: predictionsWithColor,
      }, {
        onConflict: 'date,model,category',
      })

      if (dbError) {
        console.error('Supabase insert error:', dbError)
      }
    }

    return Response.json({ predictions: predictionsWithColor, category: aiGeneratedCategory })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorName = error instanceof Error ? error.name : 'Unknown'
    console.error("Error generating prediction:", { name: errorName, message: errorMessage, error })
    return Response.json({ error: "Failed to generate prediction", details: errorMessage }, { status: 500 })
  }
}
