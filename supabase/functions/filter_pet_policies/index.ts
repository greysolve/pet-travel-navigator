
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TravelMethodFilter {
  cabin: boolean;
  cargo: boolean;
}

interface PetPolicyFilterParams {
  petTypes?: string[];
  travelMethod?: TravelMethodFilter;
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
      console.log("Applying pet types filter:", filters.petTypes);
      query = query.filter('pet_types_allowed', 'cs', `{${filters.petTypes.join(',')}}`);
    }

    // Apply travel method filter if provided
    if (filters.travelMethod) {
      console.log("Applying travel method filter:", filters.travelMethod);
      
      // Define filter conditions based on travel method
      if (filters.travelMethod.cabin && !filters.travelMethod.cargo) {
        // Only cabin travel - must have cabin weight or dimensions
        console.log("Filtering for cabin travel only");
        query = query.or(
          (queryBuilder) => {
            // Check for policies that have cabin_max_weight_kg not null
            queryBuilder
              .not('cabin_max_weight_kg', 'is', null);
            return queryBuilder;
          },
          (queryBuilder) => {
            // Or check for policies that have cabin_combined_weight_kg not null
            queryBuilder
              .not('cabin_combined_weight_kg', 'is', null);
            return queryBuilder;
          }
        );
      }
      else if (!filters.travelMethod.cabin && filters.travelMethod.cargo) {
        // Only cargo travel - must have cargo weight or dimensions
        console.log("Filtering for cargo travel only");
        query = query.or(
          (queryBuilder) => {
            // Check for policies that have cargo_max_weight_kg not null
            queryBuilder
              .not('cargo_max_weight_kg', 'is', null);
            return queryBuilder;
          },
          (queryBuilder) => {
            // Or check for policies that have cargo_combined_weight_kg not null
            queryBuilder
              .not('cargo_combined_weight_kg', 'is', null);
            return queryBuilder;
          }
        );
      }
      // If both methods are allowed or neither is allowed, no filtering needed
    }

    // Apply weight filter based on travel method
    if (filters.minWeight !== undefined || filters.maxWeight !== undefined) {
      console.log("Applying weight filters:", { 
        min: filters.minWeight, 
        max: filters.maxWeight 
      });
      
      const weightConditions = [];
      
      // For cabin weight
      if (!filters.travelMethod || filters.travelMethod.cabin) {
        if (filters.minWeight !== undefined) {
          query = query.or(
            (queryBuilder) => {
              queryBuilder
                .gte('cabin_max_weight_kg', filters.minWeight!)
                .not('cabin_max_weight_kg', 'is', null);
              return queryBuilder;
            }
          );
        }
        
        if (filters.maxWeight !== undefined) {
          query = query.or(
            (queryBuilder) => {
              queryBuilder
                .lte('cabin_max_weight_kg', filters.maxWeight!)
                .not('cabin_max_weight_kg', 'is', null);
              return queryBuilder;
            }
          );
        }
      }
      
      // For cargo weight
      if (!filters.travelMethod || filters.travelMethod.cargo) {
        if (filters.minWeight !== undefined) {
          query = query.or(
            (queryBuilder) => {
              queryBuilder
                .gte('cargo_max_weight_kg', filters.minWeight!)
                .not('cargo_max_weight_kg', 'is', null);
              return queryBuilder;
            }
          );
        }
        
        if (filters.maxWeight !== undefined) {
          query = query.or(
            (queryBuilder) => {
              queryBuilder
                .lte('cargo_max_weight_kg', filters.maxWeight!)
                .not('cargo_max_weight_kg', 'is', null);
              return queryBuilder;
            }
          );
        }
      }
    }

    // Only include policies with no breed restrictions if requested
    if (filters.includeBreedRestrictions === false) {
      console.log("Filtering for no breed restrictions");
      query = query.or(
        (queryBuilder) => {
          queryBuilder
            .is('breed_restrictions', null);
          return queryBuilder;
        },
        (queryBuilder) => {
          queryBuilder
            .eq('breed_restrictions', []);
          return queryBuilder;
        }
      );
    }

    console.log("Executing query...");
    // Execute the query
    const { data, error } = await query;

    if (error) {
      console.error("Database query failed:", error);
      throw new Error(`Database query failed: ${error.message}`);
    }

    console.log(`Query returned ${data?.length || 0} results`);

    // Process results to create match reasons
    const results = (data || []).map(policy => {
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
      
      // Check travel method matches
      if (filters.travelMethod) {
        if (filters.travelMethod.cabin && (policy.cabin_max_weight_kg || policy.cabin_combined_weight_kg)) {
          matchReasons.push(`Allows cabin travel`);
        }
        if (filters.travelMethod.cargo && (policy.cargo_max_weight_kg || policy.cargo_combined_weight_kg)) {
          matchReasons.push(`Allows cargo travel`);
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
