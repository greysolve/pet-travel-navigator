
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
 * Uses correct filter chaining instead of comma-separated filters
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
  
  // For cabin-only travel
  if (cabin && !cargo) {
    console.log("Filtering for cabin travel only");
    // Check if either cabin_max_weight_kg OR cabin_combined_weight_kg is not null
    // Fix: Use chained .or() calls instead of comma-separated strings
    return query.or('cabin_max_weight_kg.is.not.null').or('cabin_combined_weight_kg.is.not.null');
  }
  
  // For cargo-only travel
  if (!cabin && cargo) {
    console.log("Filtering for cargo travel only");
    // Check if either cargo_max_weight_kg OR cargo_combined_weight_kg is not null
    // Fix: Use chained .or() calls instead of comma-separated strings
    return query.or('cargo_max_weight_kg.is.not.null').or('cargo_combined_weight_kg.is.not.null');
  }
  
  return query;
}

/**
 * Apply weight filtering to the query
 * Completely rewritten to use proper filter syntax and chaining
 */
export function applyWeightFilter(query: any, filters: PetPolicyFilterParams): any {
  if (filters.minWeight === undefined && filters.maxWeight === undefined) {
    return query;
  }
  
  console.log("Applying weight filters:", { 
    min: filters.minWeight, 
    max: filters.maxWeight 
  });
  
  let weightQuery = query;
  
  // Handle minimum weight filter
  if (filters.minWeight !== undefined) {
    const minWeight = filters.minWeight;
    const minFilters = [];
    
    // If travel method is specified, apply the right filters
    if (filters.travelMethod) {
      if (filters.travelMethod.cabin) {
        // If cabin is allowed, check cabin weights
        minFilters.push('cabin_max_weight_kg.gte.' + minWeight);
        minFilters.push('cabin_combined_weight_kg.gte.' + minWeight);
      }
      
      if (filters.travelMethod.cargo) {
        // If cargo is allowed, check cargo weights
        minFilters.push('cargo_max_weight_kg.gte.' + minWeight);
        minFilters.push('cargo_combined_weight_kg.gte.' + minWeight);
      }
    } else {
      // If travel method not specified, check all weights
      minFilters.push('cabin_max_weight_kg.gte.' + minWeight);
      minFilters.push('cabin_combined_weight_kg.gte.' + minWeight);
      minFilters.push('cargo_max_weight_kg.gte.' + minWeight);
      minFilters.push('cargo_combined_weight_kg.gte.' + minWeight);
    }
    
    // Apply the filters with individual OR calls
    // Fix: Apply each filter separately with .or() instead of joining with commas
    for (const filter of minFilters) {
      weightQuery = weightQuery.or(filter);
    }
  }
  
  // Handle maximum weight filter
  if (filters.maxWeight !== undefined) {
    const maxWeight = filters.maxWeight;
    
    // If travel method is specified, apply the right filters
    if (filters.travelMethod) {
      if (filters.travelMethod.cabin && !filters.travelMethod.cargo) {
        // For cabin-only travel - fixed to use proper chaining
        weightQuery = weightQuery
          .or(
            `cabin_max_weight_kg.lte.${maxWeight}`
          )
          .or(
            `cabin_combined_weight_kg.lte.${maxWeight}`
          );
      } else if (!filters.travelMethod.cabin && filters.travelMethod.cargo) {
        // For cargo-only travel - fixed to use proper chaining
        weightQuery = weightQuery
          .or(
            `cargo_max_weight_kg.lte.${maxWeight}`
          )
          .or(
            `cargo_combined_weight_kg.lte.${maxWeight}`
          );
      } else if (filters.travelMethod.cabin && filters.travelMethod.cargo) {
        // For both travel methods
        weightQuery = weightQuery
          .or(`cabin_max_weight_kg.lte.${maxWeight}`)
          .or(`cabin_combined_weight_kg.lte.${maxWeight}`)
          .or(`cargo_max_weight_kg.lte.${maxWeight}`)
          .or(`cargo_combined_weight_kg.lte.${maxWeight}`);
      }
    } else {
      // If travel method not specified, check all weights
      weightQuery = weightQuery
        .or(`cabin_max_weight_kg.lte.${maxWeight}`)
        .or(`cabin_combined_weight_kg.lte.${maxWeight}`)
        .or(`cargo_max_weight_kg.lte.${maxWeight}`)
        .or(`cargo_combined_weight_kg.lte.${maxWeight}`);
    }
  }
  
  return weightQuery;
}

/**
 * Apply breed restrictions filtering to the query
 * Uses proper IS NULL and array empty check syntax with chained .or()
 */
export function applyBreedRestrictionsFilter(query: any, filters: PetPolicyFilterParams): any {
  if (filters.includeBreedRestrictions === false) {
    console.log("Filtering for no breed restrictions");
    
    // Fix: Use chained .or() calls instead of comma-separated strings
    return query.or('breed_restrictions.is.null').or('breed_restrictions.eq.{}');
  }
  
  return query;
}
