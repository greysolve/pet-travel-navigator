
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

interface FilteredPolicyResult {
  airlineId: string;
  airlineCode: string;
  airlineName: string;
  matchReason: string[];
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

    // Build the base query - we'll apply filters to this incrementally
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

    // Apply filters sequentially
    query = applyPetTypeFilter(query, filters);
    query = applyTravelMethodFilter(query, filters);
    query = applyWeightFilter(query, filters);
    query = applyBreedRestrictionsFilter(query, filters);

    console.log("Executing final query...");
    // Execute the query
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

/**
 * Apply pet type filtering to the query
 */
function applyPetTypeFilter(query: any, filters: PetPolicyFilterParams): any {
  if (!filters.petTypes || filters.petTypes.length === 0) {
    return query;
  }
  
  console.log("Applying pet types filter:", filters.petTypes);
  
  // Filter for pet types using contains operator
  return query.filter('pet_types_allowed', 'cs', `{${filters.petTypes.join(',')}}`);
}

/**
 * Apply travel method filtering to the query
 */
function applyTravelMethodFilter(query: any, filters: PetPolicyFilterParams): any {
  if (!filters.travelMethod) {
    return query;
  }
  
  const { cabin, cargo } = filters.travelMethod;
  console.log("Applying travel method filter:", { cabin, cargo });
  
  // If both are true or both are false, no filtering needed
  if ((cabin && cargo) || (!cabin && !cargo)) {
    return query;
  }
  
  // For cabin-only travel
  if (cabin && !cargo) {
    console.log("Filtering for cabin travel only");
    return query.filter('cabin_max_weight_kg.not.is.null,cabin_combined_weight_kg.not.is.null');
  }
  
  // For cargo-only travel
  if (!cabin && cargo) {
    console.log("Filtering for cargo travel only");
    return query.filter('cargo_max_weight_kg.not.is.null,cargo_combined_weight_kg.not.is.null');
  }
  
  return query;
}

/**
 * Apply weight filtering to the query
 */
function applyWeightFilter(query: any, filters: PetPolicyFilterParams): any {
  if (filters.minWeight === undefined && filters.maxWeight === undefined) {
    return query;
  }
  
  console.log("Applying weight filters:", { 
    min: filters.minWeight, 
    max: filters.maxWeight 
  });
  
  let weightQuery = query;
  
  // Apply minimum weight filter if specified
  if (filters.minWeight !== undefined) {
    const conditions = [];
    
    // If cabin travel is allowed, filter for cabin weight
    if (!filters.travelMethod || filters.travelMethod.cabin) {
      conditions.push('cabin_max_weight_kg.gte.' + filters.minWeight);
    }
    
    // If cargo travel is allowed, filter for cargo weight
    if (!filters.travelMethod || filters.travelMethod.cargo) {
      conditions.push('cargo_max_weight_kg.gte.' + filters.minWeight);
    }
    
    if (conditions.length > 0) {
      weightQuery = weightQuery.or(conditions.join(','));
    }
  }
  
  // Apply maximum weight filter if specified
  if (filters.maxWeight !== undefined) {
    const conditions = [];
    
    // If cabin travel is specified, add cabin weight condition
    if (filters.travelMethod && filters.travelMethod.cabin && !filters.travelMethod.cargo) {
      conditions.push('cabin_max_weight_kg.lte.' + filters.maxWeight);
      conditions.push('cabin_max_weight_kg.not.is.null');
    }
    
    // If cargo travel is specified, add cargo weight condition
    if (filters.travelMethod && !filters.travelMethod.cabin && filters.travelMethod.cargo) {
      conditions.push('cargo_max_weight_kg.lte.' + filters.maxWeight);
      conditions.push('cargo_max_weight_kg.not.is.null');
    }
    
    // If both travel methods are allowed or not specified, check both cabin and cargo
    if (!filters.travelMethod || (filters.travelMethod.cabin && filters.travelMethod.cargo)) {
      conditions.push('cabin_max_weight_kg.lte.' + filters.maxWeight);
      conditions.push('cargo_max_weight_kg.lte.' + filters.maxWeight);
    }
    
    if (conditions.length > 0) {
      weightQuery = weightQuery.or(conditions.join(','));
    }
  }
  
  return weightQuery;
}

/**
 * Apply breed restrictions filtering to the query
 */
function applyBreedRestrictionsFilter(query: any, filters: PetPolicyFilterParams): any {
  if (filters.includeBreedRestrictions === false) {
    console.log("Filtering for no breed restrictions");
    return query.or('breed_restrictions.is.null,breed_restrictions.eq.{}');
  }
  
  return query;
}

/**
 * Map database results to the response format with match reasons
 */
function mapResultsWithMatchReasons(data: any[] | null, filters: PetPolicyFilterParams): FilteredPolicyResult[] {
  if (!data || data.length === 0) {
    return [];
  }
  
  return data.map(policy => {
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
      if (policy.cabin_max_weight_kg !== null || policy.cabin_combined_weight_kg !== null) {
        matchReasons.push(`Cabin weight requirements match`);
      }
      if (policy.cargo_max_weight_kg !== null || policy.cargo_combined_weight_kg !== null) {
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
}
