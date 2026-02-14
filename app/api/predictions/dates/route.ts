import { supabaseAdmin } from "@/lib/supabase-admin"
import { NextResponse } from "next/server"

/**
 * GET /api/predictions/dates
 * Returns all unique dates that have predictions in the database
 */
export async function GET() {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: "Admin database access not configured" }, { status: 500 })
    }

    try {
        // Get distinct dates from predictions table, ordered descending (newest first)
        const { data, error } = await supabaseAdmin
            .from("predictions")
            .select("date")
            .order("date", { ascending: false })

        if (error) {
            console.error("Error fetching prediction dates:", error)
            return NextResponse.json({ error: "Failed to fetch dates" }, { status: 500 })
        }

        // Extract unique dates
        const uniqueDates = [...new Set(data?.map((row) => row.date) || [])]

        return NextResponse.json({ dates: uniqueDates })
    } catch (error) {
        console.error("Error in /api/predictions/dates:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
