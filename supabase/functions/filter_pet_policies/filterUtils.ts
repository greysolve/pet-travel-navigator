import { PetPolicyFilterParams } from "./types.ts";

/**
 * Apply pet type filtering to the query with enhanced flexible matching
 * Now supports case-insensitive, flexible string matching for both singular/plural forms
 */
export function applyPetTypeFilter(query: any, filters: PetPolicyFilterParams): any {
  if (!filters.petTypes || filters.petTypes.length === 0) {
    return query;
  }
  
  console.log("Applying pet types filter:", filters.petTypes);
  
  // Create flexible filters for all pet types using enhanced OR syntax
  const petTypeFilters = filters.petTypes.map(petType => {
    const normalizedType = petType.toLowerCase();
    
    // Support both singular and plural forms, case-insensitive
    switch (normalizedType) {
      case 'dog':
        return `pet_types_allowed.cs.{dog},pet_types_allowed.cs.{dogs},pet_types_allowed.ilike.%dog%,pet_types_allowed.ilike.%dogs%`;
      case 'cat':
        return `pet_types_allowed.cs.{cat},pet_types_allowed.cs.{cats},pet_types_allowed.ilike.%cat%,pet_types_allowed.ilike.%cats%`;
      case 'bird':
        return `pet_types_allowed.cs.{bird},pet_types_allowed.cs.{birds},pet_types_allowed.ilike.%bird%,pet_types_allowed.ilike.%birds%`;
      case 'rabbit':
        return `pet_types_allowed.cs.{rabbit},pet_types_allowed.cs.{rabbits},pet_types_allowed.ilike.%rabbit%,pet_types_allowed.ilike.%rabbits%`;
      case 'rodent':
        return `pet_types_allowed.cs.{rodent},pet_types_allowed.cs.{rodents},pet_types_allowed.ilike.%rodent%,pet_types_allowed.ilike.%rodents%`;
      case 'other':
        return `pet_types_allowed.cs.{other},pet_types_allowed.ilike.%other%`;
      default:
        return `pet_types_allowed.cs.{${normalizedType}},pet_types_allowed.ilike.%${normalizedType}%`;
    }
  }).join(',');
  
  // Apply the filter - only match records with proper arrays (not empty)
  if (petTypeFilters) {
    query = query.or(petTypeFilters).not('pet_types_allowed', 'eq', '{}');
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
