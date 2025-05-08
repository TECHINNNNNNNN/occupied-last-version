/**
 * EXPIRED POSTS CLEANUP FUNCTION
 * 
 * This Supabase Edge Function automatically removes expired posts
 * from the communications table based on their expires_at timestamp.
 * 
 * CONTEXT:
 * - Runs on schedule (every 15 minutes) via cron.schedule
 * - Deletes posts with expires_at timestamps in the past
 * - Returns count of deleted posts
 */

import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// CORS headers for API responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const now = new Date().toISOString();
    console.log(`Running cleanup of expired posts at ${now}`);

    // Delete posts with expiration times in the past
    const { error, count } = await supabaseClient
      .from("communications")
      .delete()
      .lt("expires_at", now)
      .select("count");

    if (error) {
      console.error("Error cleaning up expired posts:", error);
      throw error;
    }

    console.log(`Successfully deleted ${count} expired posts`);

    // Return success response with deletion count
    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${count} expired posts`,
        deletedCount: count,
        timestamp: now,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Function execution failed:", error);
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    );
  }
}); 