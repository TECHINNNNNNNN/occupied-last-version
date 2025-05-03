import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a Supabase client with anonymous key for public access
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a Supabase client with service role key for admin access (bypasses RLS)
// WARNING: Only use for server-side operations and secure API routes
export const supabaseAdmin = supabase; 