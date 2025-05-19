
import { PetPolicy } from "@/components/flight-results/types";
import { PetPolicyFilterParams, TravelMethodFilter } from "@/types/policy-filters";
import { isPremiumContent } from "@/components/flight-results/types";

/**
 * Filter pet policies based on active filters
 */
export const filterPoliciesByActiveFilters = (policies: Record<string, PetPolicy>, activeFilters?: PetPolicyFilterParams): Record<string, PetPolicy> => {
  if (!activeFilters || Object.keys(activeFilters).length === 0) return policies;

  return Object.entries(policies).reduce((filteredPolicies: Record<string, PetPolicy>, [airlineId, policy]: [string, PetPolicy]) => {
    if (!policy) return filteredPolicies;
    
    // Check if the policy matches all active filters
    if (shouldIncludePolicy(policy, activeFilters)) {
      filteredPolicies[airlineId] = policy;
    }
    
    return filteredPolicies;
  }, {});
};

/**
 * Determine if a policy should be included based on filters
 */
export const shouldIncludePolicy = (policy: PetPolicy, activeFilters: PetPolicyFilterParams): boolean => {
  // Apply pet type filter
  if (activeFilters.petTypes && activeFilters.petTypes.length > 0) {
    // Skip premium content fields or empty arrays
    if (!policy.pet_types_allowed || isPremiumContent(policy.pet_types_allowed)) {
      return false;
    }
    
    // Check if the policy allows any of the selected pet types
    const petMatch = activeFilters.petTypes.some(petType => {
      // Check if pet type is in the allowed pet types array
      if (!Array.isArray(policy.pet_types_allowed)) return false;
      
      if (petType === 'dog' && policy.pet_types_allowed.includes('dog')) return true;
      if (petType === 'cat' && policy.pet_types_allowed.includes('cat')) return true;
      if (petType === 'bird' && policy.pet_types_allowed.includes('bird')) return true;
      if (petType === 'rabbit' && policy.pet_types_allowed.includes('rabbit')) return true;
      if (petType === 'rodent' && policy.pet_types_allowed.includes('rodent')) return true;
      if (petType === 'other' && policy.pet_types_allowed.includes('other')) return true;
      return false;
    });
    
    if (!petMatch) return false;
  }

  // Apply travel method filter
  if (activeFilters.travelMethod) {
    const { cabin, cargo } = activeFilters.travelMethod as TravelMethodFilter;
    
    // If neither cabin nor cargo is allowed, no policies match
    if (!cabin && !cargo) return false;
    
    // Check if cabin is required but not supported by policy
    const supportsCabin = policy.cabin_max_weight_kg !== undefined || policy.cabin_linear_dimensions_cm !== undefined;
    if (cabin && !cargo && !supportsCabin) return false;
    
    // Check if cargo is required but not supported by policy
    const supportsCargo = policy.cargo_max_weight_kg !== undefined || policy.cargo_linear_dimensions_cm !== undefined;
    if (!cabin && cargo && !supportsCargo) return false;
    
    // If both are required but policy doesn't support both, exclude
    if (cabin && cargo && !supportsCabin && !supportsCargo) return false;
  }

  // Apply weight filter - FIXED LOGIC
  if (activeFilters.minWeight !== undefined || activeFilters.maxWeight !== undefined) {
    // For cabin
    const cabinMinWeight = 0; // Default minimum if not specified
    const cabinMaxWeight = policy.cabin_max_weight_kg;
    
    // For cargo
    const cargoMinWeight = 0; // Default minimum if not specified
    const cargoMaxWeight = policy.cargo_max_weight_kg;
    
    // Log weight values for debugging - FIX: Use airline_code/airline_id instead of airline_name
    console.log("Checking weight filters for policy:", {
      airline_id: policy.airline_id || "Unknown airline",
      cabinMaxWeight,
      cargoMaxWeight,
      filterMinWeight: activeFilters.minWeight,
      filterMaxWeight: activeFilters.maxWeight
    });
    
    // Handle min weight filter
    if (activeFilters.minWeight !== undefined) {
      // FIXED: Exclude if min weight exceeds both cabin and cargo max weights
      // This means pet is heavier than what airline allows
      if (cabinMaxWeight !== undefined && cargoMaxWeight !== undefined) {
        // If policy has both cabin and cargo options
        if (activeFilters.minWeight > cabinMaxWeight && activeFilters.minWeight > cargoMaxWeight) {
          console.log("Excluding: Pet min weight exceeds both cabin and cargo limits");
          return false;
        }
      } else if (cabinMaxWeight !== undefined) {
        // If policy only has cabin option
        if (activeFilters.minWeight > cabinMaxWeight) {
          console.log("Excluding: Pet min weight exceeds cabin limit");
          return false;
        }
      } else if (cargoMaxWeight !== undefined) {
        // If policy only has cargo option
        if (activeFilters.minWeight > cargoMaxWeight) {
          console.log("Excluding: Pet min weight exceeds cargo limit");
          return false;
        }
      } else {
        // If policy doesn't specify any weight limits
        console.log("Excluding: Policy has no weight limits defined");
        return false;
      }
    }
    
    // Handle max weight filter - FIXED LOGIC
    if (activeFilters.maxWeight !== undefined) {
      // FIXED: Check if the user's max weight is less than the minimum required
      // This would mean the pet is too light for airline requirements
      if (activeFilters.maxWeight < cabinMinWeight && activeFilters.maxWeight < cargoMinWeight) {
        console.log("Excluding: Pet max weight is below minimum requirements");
        return false;
      }
      
      // FIXED: Fix the cabin-only weight check
      if (activeFilters.travelMethod && activeFilters.travelMethod.cabin && !activeFilters.travelMethod.cargo) {
        // For cabin-only: include if airline allows this pet weight in cabin
        // FIXED: Policy should be included if the airline's max weight is 
        // greater than or equal to the user's maximum weight
        if (cabinMaxWeight === undefined || activeFilters.maxWeight > cabinMaxWeight) {
          console.log("Excluding: Pet max weight exceeds cabin limit for cabin-only travel");
          return false;
        }
      }
      
      // FIXED: Fix the cargo-only weight check  
      if (activeFilters.travelMethod && !activeFilters.travelMethod.cabin && activeFilters.travelMethod.cargo) {
        // For cargo-only: include if airline allows this pet weight in cargo
        // FIXED: Policy should be included if the airline's max weight is 
        // greater than or equal to the user's maximum weight
        if (cargoMaxWeight === undefined || activeFilters.maxWeight > cargoMaxWeight) {
          console.log("Excluding: Pet max weight exceeds cargo limit for cargo-only travel");
          return false;
        }
      }
    }
  }

  // Apply breed restrictions filter
  if (activeFilters.includeBreedRestrictions === false) {
    // Only include policies that don't have breed restrictions
    if (policy.breed_restrictions) {
      // Skip premium content fields
      if (isPremiumContent(policy.breed_restrictions)) {
        return false;
      }
      
      // Check if the array has any breed restrictions
      if (Array.isArray(policy.breed_restrictions) && policy.breed_restrictions.length > 0) {
        return false;
      }
    }
  }

  // If passed all filters, include the policy
  return true;
};
