
import { PetPolicyFilterParams } from "./types.ts";

/**
 * Apply pet type filtering to the query
 * Uses proper array containment operators
 */
export function applyPetTypeFilter(query: any, filters: PetPolicyFilterParams): any {
  if (!filters.petTypes || filters.petTypes.length === 0) {
    return query;
  }
  
  console.log("Applying pet types filter:", filters.petTypes);
  
  // Create a combined filter for all pet types using proper OR syntax
  const petTypeFilters = filters.petTypes.map(petType => {
    // The @> operator checks if array on left contains array on right
    return `pet_types_allowed.cs.{${petType}}`;
  });
  
  // Apply each pet type filter with individual OR conditions
  let petTypeQuery = query;
  for (const filter of petTypeFilters) {
    petTypeQuery = petTypeQuery.or(filter);
  }
  
  return petTypeQuery;
}

/**
 * Apply travel method filtering to the query
 */
export function applyTravelMethodFilter(query: any, filters: PetPolicyFilterParams): any {
  if (!filters.travelMethod) {
    return query;
  }
  
  const { cabin, cargo } = filters.travelMethod;
  console.log("Applying travel method filter:", { cabin, cargo });
  
  // If both are true or both are false, no filtering needed
  if ((cabin && cargo) || (!cabin && !cargo)) {
    return query;
  }
  
  let travelMethodQuery = query;
  
  // For cabin-only travel
  if (cabin && !cargo) {
    console.log("Filtering for cabin travel only");
    // Check if cabin_max_weight_kg OR cabin_combined_weight_kg is not null
    travelMethodQuery = query.or('cabin_max_weight_kg.not.is.null').or('cabin_combined_weight_kg.not.is.null');
  }
  
  // For cargo-only travel
  if (!cabin && cargo) {
    console.log("Filtering for cargo travel only");
    // Check if cargo_max_weight_kg OR cargo_combined_weight_kg is not null
    travelMethodQuery = query.or('cargo_max_weight_kg.not.is.null').or('cargo_combined_weight_kg.not.is.null');
  }
  
  return travelMethodQuery;
}

/**
 * Apply weight filtering to the query
 * Simplified to match the user's mental model: "Show me airlines that accept my pet weighing X kg"
 */
export function applyWeightFilter(query: any, filters: PetPolicyFilterParams): any {
  // Only proceed if we have weight filters
  if (filters.minWeight === undefined && filters.maxWeight === undefined) {
    return query;
  }
  
  console.log("Applying weight filters:", { 
    min: filters.minWeight, 
    max: filters.maxWeight 
  });
  
  let weightQuery = query;
  
  // Handle max weight filter (the pet's actual weight) - this is the most common use case
  // "My pet weighs X kg - show me airlines that will allow this"
  if (filters.maxWeight !== undefined) {
    const petWeight = filters.maxWeight;
    
    if (filters.travelMethod) {
      // If specific travel method is selected, only check the relevant fields
      if (filters.travelMethod.cabin && !filters.travelMethod.cargo) {
        // For cabin-only travel: Find policies where cabin max weight >= pet's weight
        weightQuery = query
          .or(`cabin_max_weight_kg.gte.${petWeight}`)
          .or(`cabin_combined_weight_kg.gte.${petWeight}`);
      } 
      else if (!filters.travelMethod.cabin && filters.travelMethod.cargo) {
        // For cargo-only travel: Find policies where cargo max weight >= pet's weight
        weightQuery = query
          .or(`cargo_max_weight_kg.gte.${petWeight}`)
          .or(`cargo_combined_weight_kg.gte.${petWeight}`);
      }
      else if (filters.travelMethod.cabin && filters.travelMethod.cargo) {
        // For both travel methods: Find policies where either cabin or cargo max weight >= pet's weight
        weightQuery = query
          .or(`cabin_max_weight_kg.gte.${petWeight}`)
          .or(`cabin_combined_weight_kg.gte.${petWeight}`)
          .or(`cargo_max_weight_kg.gte.${petWeight}`)
          .or(`cargo_combined_weight_kg.gte.${petWeight}`);
      }
    } else {
      // If travel method not specified, check all weight fields
      weightQuery = query
        .or(`cabin_max_weight_kg.gte.${petWeight}`)
        .or(`cabin_combined_weight_kg.gte.${petWeight}`)
        .or(`cargo_max_weight_kg.gte.${petWeight}`)
        .or(`cargo_combined_weight_kg.gte.${petWeight}`);
    }
  }
  
  // Handle min weight filter if provided (less common)
  if (filters.minWeight !== undefined) {
    // Implementation follows the same pattern as max weight
    // but will rarely be used in practice
    const minWeight = filters.minWeight;
    
    // Since this is an edge case, we'll implement a simple version
    // that just ensures the airline has some weight limit defined
    // that is at least the minimum specified
    weightQuery = weightQuery
      .or(`cabin_max_weight_kg.gte.${minWeight}`)
      .or(`cabin_combined_weight_kg.gte.${minWeight}`)
      .or(`cargo_max_weight_kg.gte.${minWeight}`)
      .or(`cargo_combined_weight_kg.gte.${minWeight}`);
  }
  
  return weightQuery;
}

/**
 * Apply breed restrictions filtering to the query
 */
export function applyBreedRestrictionsFilter(query: any, filters: PetPolicyFilterParams): any {
  if (filters.includeBreedRestrictions === false) {
    console.log("Filtering for no breed restrictions");
    
    // Only include policies with no breed restrictions (null or empty array)
    return query.or('breed_restrictions.is.null').or('breed_restrictions.eq.{}');
  }
  
  return query;
}
