
import { useState, useCallback, useEffect } from 'react';
import { 
  PetTypeFilter, 
  TravelMethodFilter, 
  WeightFilterOptions, 
  PetPolicyFilterParams 
} from '@/types/policy-filters';
import { supabase } from '@/integrations/supabase/client';
import { FilteredPolicyResult } from '@/types/policy-filters';

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
  const [isFiltering, setIsFiltering] = useState(false);
  const [filteredPolicies, setFilteredPolicies] = useState<FilteredPolicyResult[]>([]);
  const [filterError, setFilterError] = useState<string | null>(null);

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

  // Apply filters and fetch filtered policies
  const applyFilters = useCallback(async (filterParams: PetPolicyFilterParams) => {
    setIsFiltering(true);
    setFilterError(null);
    
    try {
      // Update local filters state
      setFilters(filterParams);
      
      // Make API call to edge function
      const { data, error } = await supabase.functions.invoke('filter_pet_policies', {
        body: { filters: filterParams }
      });
      
      if (error) {
        console.error('Error filtering pet policies:', error);
        setFilterError(error.message || 'Error filtering policies');
        setFilteredPolicies([]);
        return [];
      }
      
      if (data && data.results) {
        setFilteredPolicies(data.results);
        return data.results;
      }
      
      setFilteredPolicies([]);
      return [];
    } catch (err: any) {
      console.error('Unexpected error filtering policies:', err);
      setFilterError('Unexpected error occurred while filtering');
      setFilteredPolicies([]);
      return [];
    } finally {
      setIsFiltering(false);
    }
  }, []);

  // Reset all filters to default values
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setFilteredPolicies([]);
  }, []);

  return {
    filters,
    isLoaded,
    isFiltering,
    filteredPolicies,
    filterError,
    applyFilters,
    resetFilters
  };
}
