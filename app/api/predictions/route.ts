import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    if (!supabase) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date'); // Format: '2026-01-31'

    if (!date) {
        return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
    }

    const { data, error } = await supabase
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
