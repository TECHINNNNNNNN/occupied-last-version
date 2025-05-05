/**
 * Cleanup Expired Holds - Scheduled Edge Function
 * ===============================================
 * PURPOSE:
 *   This serverless function automatically cancels reservation holds that have
 *   expired. It's a critical part of the concurrency control system to ensure
 *   that temporarily held slots become available again if a user abandons the
 *   reservation process or experiences technical issues.
 * 
 * EXECUTION CONTEXT:
 *   Runs as a scheduled Edge Function in Supabase, typically every minute.
 *   Requires service role key to have permission to execute database functions.
 * 
 * PROCESS:
 *   1. Handles any CORS preflight requests
 *   2. Connects to Supabase with admin privileges
 *   3. Calls the cleanup_expired_holds database function
 *   4. Returns a success or error response
 * 
 * SECURITY:
 *   Uses SERVICE_ROLE_KEY which has elevated permissions, but is safe in this
 *   context because it runs server-side in a controlled environment.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.22.0'

// CORS headers to allow cross-origin requests
// These are necessary if the function is ever called directly from a browser
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests (OPTIONS method)
  // This is standard for APIs that might receive browser requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    // Create a Supabase client with admin privileges
    // The SERVICE_ROLE_KEY has full database access, unlike the anon key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Execute the database function that does the actual cleanup
    // This function updates all pending reservations with expired holds to 'cancelled'
    const { error } = await supabaseAdmin.rpc('cleanup_expired_holds')
    
    // If the database function returned an error, propagate it
    if (error) throw error
    
    // Return a success response with informative message
    return new Response(
      JSON.stringify({ message: 'Expired reservation holds cleaned up successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    // Return a detailed error response if something went wrong
    // This helps with debugging issues that might occur
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 