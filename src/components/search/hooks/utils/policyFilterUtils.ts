
import { PetPolicy } from "@/components/flight-results/types";
import { PetPolicyFilterParams, TravelMethodFilter } from "@/types/policy-filters";

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
    // Check if the policy allows any of the selected pet types
    const petMatch = activeFilters.petTypes.some(petType => {
      if (petType === 'dog' && policy.allows_dogs) return true;
      if (petType === 'cat' && policy.allows_cats) return true;
      if (petType === 'bird' && policy.allows_birds) return true;
      if (petType === 'rabbit' && policy.allows_rabbits) return true;
      if (petType === 'rodent' && policy.allows_rodents) return true;
      if (petType === 'other' && policy.allows_other_pets) return true;
      return false;
    });
    
    if (!petMatch) return false;
  }

  // Apply travel method filter
  if (activeFilters.travelMethod) {
    const { cabin, cargo } = activeFilters.travelMethod as TravelMethodFilter;
    
    // If neither cabin nor cargo is allowed, no policies match
    if (!cabin && !cargo) return false;
    
    // If only cabin is allowed but policy doesn't allow cabin, exclude
    if (cabin && !cargo && !policy.allows_in_cabin) return false;
    
    // If only cargo is allowed but policy doesn't allow cargo, exclude
    if (!cabin && cargo && !policy.allows_checked_cargo) return false;
    
    // If both are required but policy doesn't allow both, exclude
    if (cabin && cargo && !policy.allows_in_cabin && !policy.allows_checked_cargo) return false;
  }

  // Apply weight filter
  if (activeFilters.minWeight !== undefined || activeFilters.maxWeight !== undefined) {
    // Handle min weight filter
    if (activeFilters.minWeight !== undefined) {
      const policyMinWeight = policy.min_weight_kg;
      
      // If no policy minimum weight is specified, assume it's 0
      const effectivePolicyMin = policyMinWeight !== undefined ? policyMinWeight : 0;
      
      // If the filter minimum exceeds the policy maximum, exclude
      if (activeFilters.minWeight > policy.max_weight_kg) return false;
    }
    
    // Handle max weight filter
    if (activeFilters.maxWeight !== undefined) {
      const policyMaxWeight = policy.max_weight_kg;
      
      // If no policy maximum weight is specified, we can't compare
      if (policyMaxWeight === undefined) return false;
      
      // If the filter maximum is less than the policy minimum, exclude
      if (activeFilters.maxWeight < (policy.min_weight_kg || 0)) return false;
    }
  }

  // Apply breed restrictions filter
  if (activeFilters.includeBreedRestrictions === false) {
    // Only include policies that don't have breed restrictions
    if (policy.has_breed_restrictions) return false;
  }

  // If passed all filters, include the policy
  return true;
};
