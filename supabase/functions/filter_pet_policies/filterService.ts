
import { PetPolicyFilterParams } from "./types.ts";
import { 
  applyPetTypeFilter, 
  applyTravelMethodFilter, 
  applyWeightFilter, 
  applyBreedRestrictionsFilter 
} from "./filterUtils.ts";

/**
 * Apply all filters to the query based on the provided parameters
 */
export function applyFilters(supabase: any, filters: PetPolicyFilterParams): any {
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

  return query;
}

/**
 * Map database results to the response format with match reasons
 */
export function mapResultsWithMatchReasons(data: any[] | null, filters: PetPolicyFilterParams): any[] {
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
