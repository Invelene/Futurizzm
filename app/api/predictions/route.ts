import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Admin database access not configured' }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date'); // Format: '2026-01-31'

    if (!date) {
        return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
        .from('predictions')
        .select('*')
        .eq('date', date)
        .order('model');

    if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
}
