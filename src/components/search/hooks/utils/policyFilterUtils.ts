
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
 * Determine if a policy should be included based on filters - Enhanced for new structure
 */
export const shouldIncludePolicy = (policy: PetPolicy, activeFilters: PetPolicyFilterParams): boolean => {
  // Apply pet type filter - Enhanced logic for new dual-field approach
  if (activeFilters.petTypes && activeFilters.petTypes.length > 0) {
    let petMatch = false;
    
    // First, check if pet_types_allowed has proper array data
    if (policy.pet_types_allowed && Array.isArray(policy.pet_types_allowed) && policy.pet_types_allowed.length > 0) {
      // Skip premium content fields
      if (!isPremiumContent(policy.pet_types_allowed)) {
        petMatch = activeFilters.petTypes.some(petType => {
          // Type guard to ensure we're working with an array
          if (Array.isArray(policy.pet_types_allowed)) {
            return policy.pet_types_allowed.some((allowedType: string) => {
              const filterTypeLower = petType.toLowerCase();
              const allowedTypeLower = allowedType.toLowerCase();
              
              // Support flexible matching (dog/dogs, cat/cats, etc.)
              return allowedTypeLower === filterTypeLower ||
                     allowedTypeLower === filterTypeLower + 's' ||
                     allowedTypeLower + 's' === filterTypeLower ||
                     allowedTypeLower.includes(filterTypeLower) ||
                     filterTypeLower.includes(allowedTypeLower);
            });
          }
          return false;
        });
      }
    }
    
    // If no match in pet_types_allowed, check size_restrictions for pet_type_notes
    if (!petMatch && policy.size_restrictions && typeof policy.size_restrictions === 'object') {
      const sizeRestrictions = policy.size_restrictions as any;
      if (sizeRestrictions.pet_type_notes && typeof sizeRestrictions.pet_type_notes === 'string') {
        const notes = sizeRestrictions.pet_type_notes.toLowerCase();
        petMatch = activeFilters.petTypes.some(petType => 
          notes.includes(petType.toLowerCase())
        );
      }
    }
    
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
    const cabinMaxWeight = policy.cabin_max_weight_kg;
    const cargoMaxWeight = policy.cargo_max_weight_kg;
    
    console.log("Checking weight filters for policy:", {
      cabinMaxWeight,
      cargoMaxWeight,
      filterMinWeight: activeFilters.minWeight,
      filterMaxWeight: activeFilters.maxWeight
    });
    
    // Handle max weight filter (most common case - user specifies their pet's weight)
    if (activeFilters.maxWeight !== undefined) {
      const petWeight = activeFilters.maxWeight;
      
      // Determine which travel methods are allowed
      const allowsCabin = !activeFilters.travelMethod || activeFilters.travelMethod.cabin;
      const allowsCargo = !activeFilters.travelMethod || activeFilters.travelMethod.cargo;
      
      // Check if airline can accommodate this pet weight
      let canAccommodate = false;
      
      // Check cabin option if allowed
      if (allowsCabin && cabinMaxWeight !== undefined && cabinMaxWeight !== null) {
        if (petWeight <= cabinMaxWeight) {
          canAccommodate = true;
          console.log(`✓ Cabin can accommodate ${petWeight}kg (limit: ${cabinMaxWeight}kg)`);
        } else {
          console.log(`✗ Cabin cannot accommodate ${petWeight}kg (limit: ${cabinMaxWeight}kg)`);
        }
      }
      
      // Check cargo option if allowed and cabin didn't work
      if (!canAccommodate && allowsCargo && cargoMaxWeight !== undefined && cargoMaxWeight !== null) {
        if (petWeight <= cargoMaxWeight) {
          canAccommodate = true;
          console.log(`✓ Cargo can accommodate ${petWeight}kg (limit: ${cargoMaxWeight}kg)`);
        } else {
          console.log(`✗ Cargo cannot accommodate ${petWeight}kg (limit: ${cargoMaxWeight}kg)`);
        }
      }
      
      // If airline has no weight limits defined for the allowed travel methods, exclude
      if (!canAccommodate && 
          ((allowsCabin && (cabinMaxWeight === undefined || cabinMaxWeight === null)) ||
           (allowsCargo && (cargoMaxWeight === undefined || cargoMaxWeight === null)))) {
        console.log("✗ Airline has no weight limits defined for allowed travel methods");
        return false;
      }
      
      // If airline cannot accommodate the pet weight, exclude this policy
      if (!canAccommodate) {
        console.log(`✗ Excluding airline: cannot accommodate ${petWeight}kg pet`);
        return false;
      }
    }
    
    // Handle min weight filter (less common - used for minimum weight requirements)
    if (activeFilters.minWeight !== undefined) {
      const minPetWeight = activeFilters.minWeight;
      
      // For min weight, we need to ensure the airline can handle at least this weight
      // This is similar to max weight but checking the minimum threshold
      const allowsCabin = !activeFilters.travelMethod || activeFilters.travelMethod.cabin;
      const allowsCargo = !activeFilters.travelMethod || activeFilters.travelMethod.cargo;
      
      let canHandleMinWeight = false;
      
      // Check if cabin can handle the minimum weight
      if (allowsCabin && cabinMaxWeight !== undefined && cabinMaxWeight !== null) {
        if (minPetWeight <= cabinMaxWeight) {
          canHandleMinWeight = true;
        }
      }
      
      // Check if cargo can handle the minimum weight
      if (!canHandleMinWeight && allowsCargo && cargoMaxWeight !== undefined && cargoMaxWeight !== null) {
        if (minPetWeight <= cargoMaxWeight) {
          canHandleMinWeight = true;
        }
      }
      
      if (!canHandleMinWeight) {
        console.log(`✗ Excluding airline: cannot handle minimum weight of ${minPetWeight}kg`);
        return false;
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
