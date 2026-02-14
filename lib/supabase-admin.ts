import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create admin client with Service Role Key
// Warning: This client bypasses Row Level Security. Use only in secure server-side contexts.
export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

// Helper to check if Admin Supabase is configured
export function isAdminSupabaseConfigured(): boolean {
    return supabaseAdmin !== null;
}
