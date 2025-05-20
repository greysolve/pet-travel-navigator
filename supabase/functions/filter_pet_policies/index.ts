
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { 
  applyFilters, 
  mapResultsWithMatchReasons 
} from "./filterService.ts";
import { PetPolicyFilterParams } from "./types.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting pet policy filter function");
    
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Parse filter params from request
    const { filters } = await req.json() as { filters: PetPolicyFilterParams };
    console.log("Received filters:", JSON.stringify(filters, null, 2));

    // Apply filters and execute query
    const query = applyFilters(supabase, filters);
    console.log("Executing final query...");
    const { data, error } = await query;

    if (error) {
      console.error("Database query failed:", error);
      throw new Error(`Database query failed: ${error.message}`);
    }

    console.log(`Query returned ${data?.length || 0} results`);
    
    // Map results to our response format with match reasons
    const results = mapResultsWithMatchReasons(data, filters);
    
    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in filter_pet_policies function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
