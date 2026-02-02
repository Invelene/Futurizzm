import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    if (!supabase) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    try {
        const { predictionId, action } = await req.json();

        if (!predictionId || !action) {
            return NextResponse.json(
                { error: 'predictionId and action required' },
                { status: 400 }
            );
        }

        if (action === 'like') {
            const { error } = await supabase.rpc('increment_likes', {
                prediction_id: predictionId
            });
            if (error) throw error;
        } else if (action === 'unlike') {
            const { error } = await supabase.rpc('decrement_likes', {
                prediction_id: predictionId
            });
            if (error) throw error;
        } else {
            return NextResponse.json(
                { error: 'action must be "like" or "unlike"' },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Like error:', error);
        return NextResponse.json(
            { error: 'Failed to update like' },
            { status: 500 }
        );
    }
}
