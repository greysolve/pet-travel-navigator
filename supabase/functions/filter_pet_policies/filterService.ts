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
      weight_includes_carrier,
      size_restrictions
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
    
    // Check pet type matches - enhanced logic for new structure
    if (filters.petTypes && filters.petTypes.length > 0) {
      // Check if pet_types_allowed has proper array data
      if (policy.pet_types_allowed && Array.isArray(policy.pet_types_allowed) && policy.pet_types_allowed.length > 0) {
        const matchedTypes = filters.petTypes.filter(filterType => 
          policy.pet_types_allowed.some((allowedType: string) => 
            allowedType.toLowerCase().includes(filterType.toLowerCase()) ||
            filterType.toLowerCase().includes(allowedType.toLowerCase())
          )
        );
        if (matchedTypes.length > 0) {
          matchReasons.push(`Allows ${matchedTypes.join(', ')}`);
        }
      }
      // Check if there's pet type information in size_restrictions
      else if (policy.size_restrictions?.pet_type_notes) {
        const notes = policy.size_restrictions.pet_type_notes.toLowerCase();
        const matchedTypes = filters.petTypes.filter(filterType => 
          notes.includes(filterType.toLowerCase())
        );
        if (matchedTypes.length > 0) {
          matchReasons.push(`Pet policy available for ${matchedTypes.join(', ')}`);
        }
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
    
    // Check weight matches with specific context and limits
    if (filters.maxWeight !== undefined) {
      const petWeight = filters.maxWeight;
      const travelMethod = filters.travelMethod;
      
      // For cabin-only travel
      if (travelMethod?.cabin && !travelMethod?.cargo) {
        if (policy.cabin_max_weight_kg !== null && policy.cabin_max_weight_kg >= petWeight) {
          let reason = `Cabin limit: ${policy.cabin_max_weight_kg}kg`;
          if (policy.weight_includes_carrier !== null) {
            reason += policy.weight_includes_carrier ? " (includes carrier)" : " (pet only)";
          }
          matchReasons.push(reason);
        } else if (policy.cabin_combined_weight_kg !== null && policy.cabin_combined_weight_kg >= petWeight) {
          let reason = `Cabin combined limit: ${policy.cabin_combined_weight_kg}kg`;
          if (policy.weight_includes_carrier !== null) {
            reason += policy.weight_includes_carrier ? " (includes carrier)" : " (pet only)";
          }
          matchReasons.push(reason);
        }
      }
      // For cargo-only travel
      else if (!travelMethod?.cabin && travelMethod?.cargo) {
        if (policy.cargo_max_weight_kg !== null && policy.cargo_max_weight_kg >= petWeight) {
          let reason = `Cargo limit: ${policy.cargo_max_weight_kg}kg`;
          if (policy.weight_includes_carrier !== null) {
            reason += policy.weight_includes_carrier ? " (includes carrier)" : " (pet only)";
          }
          matchReasons.push(reason);
        } else if (policy.cargo_combined_weight_kg !== null && policy.cargo_combined_weight_kg >= petWeight) {
          let reason = `Cargo combined limit: ${policy.cargo_combined_weight_kg}kg`;
          if (policy.weight_includes_carrier !== null) {
            reason += policy.weight_includes_carrier ? " (includes carrier)" : " (pet only)";
          }
          matchReasons.push(reason);
        }
      }
      // For both or unspecified travel methods
      else {
        if (policy.cabin_max_weight_kg !== null && policy.cabin_max_weight_kg >= petWeight) {
          let reason = `Cabin limit: ${policy.cabin_max_weight_kg}kg`;
          if (policy.weight_includes_carrier !== null) {
            reason += policy.weight_includes_carrier ? " (includes carrier)" : " (pet only)";
          }
          matchReasons.push(reason);
        }
        if (policy.cabin_combined_weight_kg !== null && policy.cabin_combined_weight_kg >= petWeight) {
          let reason = `Cabin combined limit: ${policy.cabin_combined_weight_kg}kg`;
          if (policy.weight_includes_carrier !== null) {
            reason += policy.weight_includes_carrier ? " (includes carrier)" : " (pet only)";
          }
          matchReasons.push(reason);
        }
        if (policy.cargo_max_weight_kg !== null && policy.cargo_max_weight_kg >= petWeight) {
          let reason = `Cargo limit: ${policy.cargo_max_weight_kg}kg`;
          if (policy.weight_includes_carrier !== null) {
            reason += policy.weight_includes_carrier ? " (includes carrier)" : " (pet only)";
          }
          matchReasons.push(reason);
        }
        if (policy.cargo_combined_weight_kg !== null && policy.cargo_combined_weight_kg >= petWeight) {
          let reason = `Cargo combined limit: ${policy.cargo_combined_weight_kg}kg`;
          if (policy.weight_includes_carrier !== null) {
            reason += policy.weight_includes_carrier ? " (includes carrier)" : " (pet only)";
          }
          matchReasons.push(reason);
        }
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
