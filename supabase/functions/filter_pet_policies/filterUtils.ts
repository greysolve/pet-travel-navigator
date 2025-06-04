
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
  
  // Join all conditions with commas for a single OR statement
  if (petTypeFilters.length > 0) {
    query = query.or(petTypeFilters.join(','));
  }
  
  return query;
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
    travelMethodQuery = query.or('cabin_max_weight_kg.not.is.null,cabin_combined_weight_kg.not.is.null');
  }
  
  // For cargo-only travel
  if (!cabin && cargo) {
    console.log("Filtering for cargo travel only");
    // Check if cargo_max_weight_kg OR cargo_combined_weight_kg is not null
    travelMethodQuery = query.or('cargo_max_weight_kg.not.is.null,cargo_combined_weight_kg.not.is.null');
  }
  
  return travelMethodQuery;
}

/**
 * Apply weight filtering to the query with strict travel method adherence
 * Fixed to properly respect the selected travel method
 */
export function applyWeightFilter(query: any, filters: PetPolicyFilterParams): any {
  // Only proceed if we have a max weight filter
  if (filters.maxWeight === undefined) {
    return query;
  }
  
  console.log("Applying weight filter:", { max: filters.maxWeight, travelMethod: filters.travelMethod });
  
  const petWeight = filters.maxWeight;
  let weightQuery = query;
  
  if (filters.travelMethod) {
    const { cabin, cargo } = filters.travelMethod;
    
    // For cabin-only travel: ONLY check cabin weight fields
    if (cabin && !cargo) {
      console.log("Filtering weight for cabin-only travel");
      weightQuery = query.or(`cabin_max_weight_kg.gte.${petWeight},cabin_combined_weight_kg.gte.${petWeight}`);
    } 
    // For cargo-only travel: ONLY check cargo weight fields
    else if (!cabin && cargo) {
      console.log("Filtering weight for cargo-only travel");
      weightQuery = query.or(`cargo_max_weight_kg.gte.${petWeight},cargo_combined_weight_kg.gte.${petWeight}`);
    }
    // For both travel methods: Check either cabin OR cargo can accommodate the weight
    else if (cabin && cargo) {
      console.log("Filtering weight for both cabin and cargo travel");
      weightQuery = query.or(
        `cabin_max_weight_kg.gte.${petWeight},` +
        `cabin_combined_weight_kg.gte.${petWeight},` +
        `cargo_max_weight_kg.gte.${petWeight},` +
        `cargo_combined_weight_kg.gte.${petWeight}`
      );
    }
  } else {
    // If travel method not specified, check all weight fields
    console.log("Filtering weight for unspecified travel method");
    weightQuery = query.or(
      `cabin_max_weight_kg.gte.${petWeight},` +
      `cabin_combined_weight_kg.gte.${petWeight},` +
      `cargo_max_weight_kg.gte.${petWeight},` +
      `cargo_combined_weight_kg.gte.${petWeight}`
    );
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
    return query.or('breed_restrictions.is.null,breed_restrictions.eq.{}');
  }
  
  return query;
}
