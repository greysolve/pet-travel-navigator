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
    // For cabin
    const cabinMinWeight = 0; // Default minimum if not specified
    const cabinMaxWeight = policy.cabin_max_weight_kg;
    
    // For cargo
    const cargoMinWeight = 0; // Default minimum if not specified
    const cargoMaxWeight = policy.cargo_max_weight_kg;
    
    console.log("Checking weight filters for policy:", {
      cabinMaxWeight,
      cargoMaxWeight,
      filterMinWeight: activeFilters.minWeight,
      filterMaxWeight: activeFilters.maxWeight
    });
    
    // Handle min weight filter
    if (activeFilters.minWeight !== undefined) {
      const minWeight = activeFilters.minWeight;
      
      // If policy specifies cabin and cargo options
      if (cabinMaxWeight !== undefined && cargoMaxWeight !== undefined) {
        // Pet weight must be below at least one of the max weights
        if (minWeight > cabinMaxWeight && minWeight > cargoMaxWeight) {
          console.log("Excluding: Pet min weight exceeds both cabin and cargo limits");
          return false;
        }
      } 
      // If policy only has cabin option
      else if (cabinMaxWeight !== undefined && cargoMaxWeight === undefined) {
        if (minWeight > cabinMaxWeight) {
          console.log("Excluding: Pet min weight exceeds cabin limit");
          return false;
        }
      } 
      // If policy only has cargo option
      else if (cabinMaxWeight === undefined && cargoMaxWeight !== undefined) {
        if (minWeight > cargoMaxWeight) {
          console.log("Excluding: Pet min weight exceeds cargo limit");
          return false;
        }
      } 
      // If policy doesn't specify any weight limits
      else if (cabinMaxWeight === undefined && cargoMaxWeight === undefined) {
        console.log("Excluding: Policy has no weight limits defined");
        return false;
      }
    }
    
    // Handle max weight filter
    if (activeFilters.maxWeight !== undefined) {
      const maxWeight = activeFilters.maxWeight;
      
      // If the user specified travel method
      if (activeFilters.travelMethod) {
        // For cabin-only travel
        if (activeFilters.travelMethod.cabin && !activeFilters.travelMethod.cargo) {
          // Cabin travel must be possible with this weight
          if (cabinMaxWeight === undefined || maxWeight > cabinMaxWeight) {
            console.log("Excluding: Pet max weight exceeds cabin limit for cabin-only travel");
            return false;
          }
        }
        
        // For cargo-only travel
        if (!activeFilters.travelMethod.cabin && activeFilters.travelMethod.cargo) {
          // Cargo travel must be possible with this weight
          if (cargoMaxWeight === undefined || maxWeight > cargoMaxWeight) {
            console.log("Excluding: Pet max weight exceeds cargo limit for cargo-only travel");
            return false;
          }
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
