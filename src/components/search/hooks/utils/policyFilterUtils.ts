
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
  const airlineCode = (policy as any).airlines?.iata_code || 'Unknown';
  console.log(`🔍 Checking policy for airline ${airlineCode} against filters:`, {
    filters: activeFilters,
    policy: {
      cabin_max_weight: policy.cabin_max_weight_kg,
      cargo_max_weight: policy.cargo_max_weight_kg,
      pet_types: policy.pet_types_allowed
    }
  });

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
    
    if (!petMatch) {
      console.log(`❌ ${airlineCode}: Pet type filter failed - required ${activeFilters.petTypes}, policy allows ${policy.pet_types_allowed}`);
      return false;
    } else {
      console.log(`✅ ${airlineCode}: Pet type filter passed`);
    }
  }

  // Apply travel method filter
  if (activeFilters.travelMethod) {
    const { cabin, cargo } = activeFilters.travelMethod as TravelMethodFilter;
    
    // If neither cabin nor cargo is allowed, no policies match
    if (!cabin && !cargo) {
      console.log(`❌ ${airlineCode}: Travel method filter failed - neither cabin nor cargo allowed`);
      return false;
    }
    
    // Check if cabin is required but not supported by policy
    const supportsCabin = policy.cabin_max_weight_kg !== undefined || policy.cabin_linear_dimensions_cm !== undefined;
    if (cabin && !cargo && !supportsCabin) {
      console.log(`❌ ${airlineCode}: Cabin-only required but policy doesn't support cabin travel`);
      return false;
    }
    
    // Check if cargo is required but not supported by policy
    const supportsCargo = policy.cargo_max_weight_kg !== undefined || policy.cargo_linear_dimensions_cm !== undefined;
    if (!cabin && cargo && !supportsCargo) {
      console.log(`❌ ${airlineCode}: Cargo-only required but policy doesn't support cargo travel`);
      return false;
    }
    
    // If both are required but policy doesn't support both, exclude
    if (cabin && cargo && !supportsCabin && !supportsCargo) {
      console.log(`❌ ${airlineCode}: Both cabin and cargo required but policy supports neither`);
      return false;
    }
    
    console.log(`✅ ${airlineCode}: Travel method filter passed - cabin: ${cabin ? supportsCabin : 'not required'}, cargo: ${cargo ? supportsCargo : 'not required'}`);
  }

  // Apply weight filter - SIMPLIFIED AND FIXED LOGIC
  if (activeFilters.maxWeight !== undefined) {
    const petWeight = activeFilters.maxWeight;
    const cabinMaxWeight = policy.cabin_max_weight_kg;
    const cargoMaxWeight = policy.cargo_max_weight_kg;
    
    console.log(`🏋️ ${airlineCode}: Checking weight filter - Pet: ${petWeight}kg vs Policy limits:`, {
      cabin: cabinMaxWeight,
      cargo: cargoMaxWeight,
      travelMethod: activeFilters.travelMethod
    });
    
    // Determine which travel methods are allowed
    const allowsCabin = !activeFilters.travelMethod || activeFilters.travelMethod.cabin;
    const allowsCargo = !activeFilters.travelMethod || activeFilters.travelMethod.cargo;
    
    // Check if airline can accommodate this pet weight
    let canAccommodateInCabin = false;
    let canAccommodateInCargo = false;
    
    // Check cabin accommodation if cabin travel is allowed
    if (allowsCabin && cabinMaxWeight !== undefined && cabinMaxWeight !== null) {
      canAccommodateInCabin = petWeight <= cabinMaxWeight;
      console.log(`🏋️ ${airlineCode}: Cabin check - ${petWeight}kg ${canAccommodateInCabin ? '≤' : '>'} ${cabinMaxWeight}kg = ${canAccommodateInCabin ? 'PASS' : 'FAIL'}`);
    }
    
    // Check cargo accommodation if cargo travel is allowed
    if (allowsCargo && cargoMaxWeight !== undefined && cargoMaxWeight !== null) {
      canAccommodateInCargo = petWeight <= cargoMaxWeight;
      console.log(`🏋️ ${airlineCode}: Cargo check - ${petWeight}kg ${canAccommodateInCargo ? '≤' : '>'} ${cargoMaxWeight}kg = ${canAccommodateInCargo ? 'PASS' : 'FAIL'}`);
    }
    
    // Airline passes if it can accommodate the pet in ANY allowed travel method
    const canAccommodate = canAccommodateInCabin || canAccommodateInCargo;
    
    if (!canAccommodate) {
      console.log(`❌ ${airlineCode}: WEIGHT FILTER FAILED - Cannot accommodate ${petWeight}kg in any allowed travel method`);
      return false;
    } else {
      console.log(`✅ ${airlineCode}: WEIGHT FILTER PASSED - Can accommodate ${petWeight}kg`);
    }
  }

  // Apply min weight filter (less common)
  if (activeFilters.minWeight !== undefined) {
    const minPetWeight = activeFilters.minWeight;
    const allowsCabin = !activeFilters.travelMethod || activeFilters.travelMethod.cabin;
    const allowsCargo = !activeFilters.travelMethod || activeFilters.travelMethod.cargo;
    
    let canHandleMinWeight = false;
    
    // Check if cabin can handle the minimum weight
    if (allowsCabin && policy.cabin_max_weight_kg !== undefined && policy.cabin_max_weight_kg !== null) {
      if (minPetWeight <= policy.cabin_max_weight_kg) {
        canHandleMinWeight = true;
      }
    }
    
    // Check if cargo can handle the minimum weight
    if (!canHandleMinWeight && allowsCargo && policy.cargo_max_weight_kg !== undefined && policy.cargo_max_weight_kg !== null) {
      if (minPetWeight <= policy.cargo_max_weight_kg) {
        canHandleMinWeight = true;
      }
    }
    
    if (!canHandleMinWeight) {
      console.log(`❌ ${airlineCode}: Cannot handle minimum weight of ${minPetWeight}kg`);
      return false;
    }
  }

  // Apply breed restrictions filter
  if (activeFilters.includeBreedRestrictions === false) {
    // Only include policies that don't have breed restrictions
    if (policy.breed_restrictions) {
      // Skip premium content fields
      if (isPremiumContent(policy.breed_restrictions)) {
        console.log(`❌ ${airlineCode}: Breed restrictions filter failed - has premium breed restrictions`);
        return false;
      }
      
      // Check if the array has any breed restrictions
      if (Array.isArray(policy.breed_restrictions) && policy.breed_restrictions.length > 0) {
        console.log(`❌ ${airlineCode}: Breed restrictions filter failed - has ${policy.breed_restrictions.length} breed restrictions`);
        return false;
      }
    }
    console.log(`✅ ${airlineCode}: Breed restrictions filter passed`);
  }

  // If passed all filters, include the policy
  console.log(`🎉 ${airlineCode}: ALL FILTERS PASSED - including in results`);
  return true;
};
