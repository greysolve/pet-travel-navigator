
import { useState, useCallback, useEffect } from 'react';
import { 
  PetTypeFilter, 
  TravelMethodFilter, 
  WeightFilterOptions, 
  PetPolicyFilterParams,
  FilteredPolicyResult
} from '@/types/policy-filters';

const DEFAULT_FILTERS: PetPolicyFilterParams = {
  petTypes: undefined,
  travelMethod: { cabin: true, cargo: true },
  minWeight: undefined,
  maxWeight: undefined,
  weightIncludesCarrier: false,
  includeBreedRestrictions: true
};

const STORAGE_KEY = 'pet_policy_filters';

export function usePetPolicyFilters(initialFilters: PetPolicyFilterParams = DEFAULT_FILTERS) {
  const [filters, setFilters] = useState<PetPolicyFilterParams>(initialFilters);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved filters from localStorage on component mount
  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem(STORAGE_KEY);
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters);
        
        // Handle backwards compatibility with old format
        if (parsedFilters.travelMethod && typeof parsedFilters.travelMethod === 'string') {
          // Convert old string format to new object format
          const oldValue = parsedFilters.travelMethod;
          parsedFilters.travelMethod = {
            cabin: oldValue === 'cabin' || oldValue === 'both',
            cargo: oldValue === 'cargo' || oldValue === 'both'
          };
        }
        
        setFilters(parsedFilters);
      } else {
        setFilters(initialFilters);
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading saved filters:', error);
      setFilters(initialFilters);
      setIsLoaded(true);
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      } catch (error) {
        console.error('Error saving filters:', error);
      }
    }
  }, [filters, isLoaded]);

  // Apply filters - now purely client-side state management
  const applyFilters = useCallback(async (filterParams: PetPolicyFilterParams) => {
    console.log('Applying filters (client-side only):', filterParams);
    setFilters(filterParams);
    return []; // Return empty array since this is now just state management
  }, []);

  // Reset all filters to default values
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    filters,
    isLoaded,
    isFiltering: false, // No longer doing server-side filtering
    filteredPolicies: [], // No longer maintaining server-side filtered policies
    filterError: null, // No server-side errors
    applyFilters,
    resetFilters
  };
}
