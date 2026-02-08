import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { MODEL_CONFIG } from '@/lib/database.types'
import { getPredictionDate } from '@/lib/time-utils'

const MODEL_KEYS = ['grok', 'claude', 'gpt', 'gemini'] as const
type ModelKey = typeof MODEL_KEYS[number]

// GET: Check which models have predictions for today
// POST: Verify and retry missing models
export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || getPredictionDate()

  // Check which models have predictions
  const { data: predictions, error } = await supabase
    .from('predictions')
    .select('model, category, created_at')
    .eq('date', date)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const existingModels = new Set(predictions?.map(p => p.model) || [])
  const missingModels = MODEL_KEYS.filter(m => !existingModels.has(m))
  const allModelsPresent = missingModels.length === 0

  return NextResponse.json({
    date,
    status: allModelsPresent ? 'complete' : 'incomplete',
    summary: `${existingModels.size}/4 models have predictions`,
    models: {
      present: MODEL_KEYS.filter(m => existingModels.has(m)),
      missing: missingModels
    },
    predictions: predictions?.map(p => ({
      model: p.model,
      category: p.category,
      createdAt: p.created_at
    }))
  })
}

export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || getPredictionDate()

  // Check which models are missing
  const { data: predictions, error } = await supabase
    .from('predictions')
    .select('model')
    .eq('date', date)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const existingModels = new Set(predictions?.map(p => p.model) || [])
  const missingModels = MODEL_KEYS.filter(m => !existingModels.has(m))

  if (missingModels.length === 0) {
    return NextResponse.json({
      date,
      status: 'complete',
      message: 'All models already have predictions',
      retried: [],
      failed: []
    })
  }

  // Retry missing models by calling the generate-prediction endpoint
  const retried: ModelKey[] = []
  const failed: ModelKey[] = []
  const baseUrl = new URL(req.url).origin

  for (const modelKey of missingModels) {
    const maxRetries = 3
    let success = false

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Retrying ${modelKey} (attempt ${attempt}/${maxRetries})...`)
        
        const response = await fetch(`${baseUrl}/api/generate-prediction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelKey,
            category: 'Technology',
            topics: ['AI Innovation', 'Tech Earnings', 'Software Updates']
          })
        })

        const data = await response.json()

        if (response.ok && data.predictions && data.predictions.length > 0) {
          console.log(`✓ ${modelKey} succeeded on attempt ${attempt}`)
          retried.push(modelKey)
          success = true
          break
        } else {
          console.error(`× ${modelKey} attempt ${attempt} failed:`, data.error || 'No predictions')
        }
      } catch (err) {
        console.error(`× ${modelKey} attempt ${attempt} error:`, err)
      }

      // Exponential backoff
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
      }
    }

    if (!success) {
      failed.push(modelKey)
    }
  }

  return NextResponse.json({
    date,
    status: failed.length === 0 ? 'complete' : 'partial',
    message: `Retried ${missingModels.length} missing models`,
    retried,
    failed,
    summary: `${4 - failed.length}/4 models now have predictions`
  })
}
