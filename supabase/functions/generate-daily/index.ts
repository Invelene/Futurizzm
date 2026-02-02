// @ts-nocheck - Deno runtime types not available in standard TypeScript
// Supabase Edge Function: generate-daily-predictions
// Calls the Next.js API which uses the AI SDK properly
// Deploy: npx supabase functions deploy generate-daily --no-verify-jwt

const VERCEL_URL = Deno.env.get('VERCEL_URL') || 'https://your-app.vercel.app'

Deno.serve(async (_req) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    }

    try {
        // Call the Next.js API route which uses the AI SDK
        const response = await fetch(`${VERCEL_URL}/api/generate-prediction`, {
            method: 'GET',
        })

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        return new Response(JSON.stringify(data), { headers })
    } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers,
        })
    }
})
