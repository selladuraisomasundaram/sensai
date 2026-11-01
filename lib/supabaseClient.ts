import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!rawUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables.");
}

// Ensure the URL is the base project URL (strips trailing slashes and /rest/v1)
const supabaseUrl = rawUrl.trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
