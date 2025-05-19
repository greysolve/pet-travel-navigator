
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PetPolicyFilterParams {
  petTypes?: string[];
  travelMethod?: 'cabin' | 'cargo' | 'both';
  minWeight?: number;
  maxWeight?: number;
  weightIncludesCarrier?: boolean;
  includeBreedRestrictions?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Start building the query
    let query = supabase
      .from('pet_policies')
      .select(`
        id,
        airlines!inner(id, name, iata_code),
        pet_types_allowed,
        cabin_max_weight_kg,
        cabin_combined_weight_kg,
        cargo_max_weight_kg,
        cargo_combined_weight_kg,
        breed_restrictions,
        weight_includes_carrier
      `);

    // Apply pet type filter if provided
    if (filters.petTypes && filters.petTypes.length > 0) {
      // For each pet type, check if it's in the pet_types_allowed array
      query = query.filter('pet_types_allowed', 'cs', `{${filters.petTypes.join(',')}}`);
    }

    // Apply weight filter based on travel method
    if (filters.minWeight !== undefined || filters.maxWeight !== undefined) {
      if (filters.travelMethod === 'cabin' || filters.travelMethod === 'both') {
        // For cabin weight
        if (filters.minWeight !== undefined) {
          query = query.or(`cabin_max_weight_kg.gte.${filters.minWeight},cabin_combined_weight_kg.gte.${filters.minWeight}`);
        }
        if (filters.maxWeight !== undefined) {
          query = query.or(`cabin_max_weight_kg.lte.${filters.maxWeight},cabin_combined_weight_kg.lte.${filters.maxWeight}`);
        }
      }
      
      if (filters.travelMethod === 'cargo' || filters.travelMethod === 'both') {
        // For cargo weight
        if (filters.minWeight !== undefined) {
          query = query.or(`cargo_max_weight_kg.gte.${filters.minWeight},cargo_combined_weight_kg.gte.${filters.minWeight}`);
        }
        if (filters.maxWeight !== undefined) {
          query = query.or(`cargo_max_weight_kg.lte.${filters.maxWeight},cargo_combined_weight_kg.lte.${filters.maxWeight}`);
        }
      }
    }

    // Only include policies with no breed restrictions if requested
    if (filters.includeBreedRestrictions === false) {
      query = query.is('breed_restrictions', null).or('breed_restrictions.length.eq.0');
    }

    // Execute the query
    const { data, error } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    // Process results to create match reasons
    const results = data.map(policy => {
      const matchReasons: string[] = [];
      
      // Check pet type matches
      if (filters.petTypes && filters.petTypes.length > 0 && policy.pet_types_allowed) {
        const matchedTypes = filters.petTypes.filter(type => 
          policy.pet_types_allowed.includes(type)
        );
        if (matchedTypes.length > 0) {
          matchReasons.push(`Allows ${matchedTypes.join(', ')}`);
        }
      }
      
      // Check weight matches
      if (filters.minWeight !== undefined || filters.maxWeight !== undefined) {
        if (policy.cabin_max_weight_kg || policy.cabin_combined_weight_kg) {
          matchReasons.push(`Cabin weight requirements match`);
        }
        if (policy.cargo_max_weight_kg || policy.cargo_combined_weight_kg) {
          matchReasons.push(`Cargo weight requirements match`);
        }
      }
      
      // Check breed restrictions
      if (filters.includeBreedRestrictions === false && 
          (!policy.breed_restrictions || policy.breed_restrictions.length === 0)) {
        matchReasons.push(`No breed restrictions`);
      }
      
      return {
        airlineId: policy.airlines.id,
        airlineCode: policy.airlines.iata_code,
        airlineName: policy.airlines.name,
        matchReason: matchReasons
      };
    });

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
