/**
 * SCHEDULED EXPIRED POSTS CLEANUP
 * 
 * This scheduled function runs on a cron schedule to automatically
 * trigger the cleanup of expired posts in the communications table.
 * It's designed to be registered with Supabase's cron.schedule feature.
 * 
 * CONTEXT:
 * - Runs every 15 minutes via cron.schedule
 * - Calls the cleanup-expired-posts edge function to perform the cleanup
 */

// This code will be run by Supabase's scheduled functions runner
// with environment variables set from the Supabase dashboard

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.210.0/http/server.ts";

// The name of the function can't be customized in scheduled functions
const scheduledFunction = async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL is not set");
    }

    // Call our cleanup function using fetch
    const functionUrl = `${supabaseUrl}/functions/v1/cleanup-expired-posts`;
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to call cleanup function: ${errorText}`);
    }

    const result = await response.json();
    console.log("Cleanup completed:", result);
    return result;
  } catch (error) {
    console.error("Scheduled function error:", error);
    throw error;
  }
};

// Invoke the function directly when run as a scheduled function
serve(async () => {
  try {
    const result = await scheduledFunction();
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 