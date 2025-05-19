
import { useState, useCallback, useEffect } from 'react';

export type PetTypeFilter = 'dog' | 'cat' | 'bird' | 'rabbit' | 'rodent' | 'other';
export type TravelMethodFilter = 'cabin' | 'cargo' | 'both';

export interface WeightFilterOptions {
  min?: number;
  max?: number;
  includeCarrier?: boolean;
}

export interface PetPolicyFilters {
  petTypes: PetTypeFilter[];
  travelMethod: TravelMethodFilter;
  weight: WeightFilterOptions;
  showBreedRestrictions: boolean;
}

const DEFAULT_FILTERS: PetPolicyFilters = {
  petTypes: [],
  travelMethod: 'both',
  weight: {},
  showBreedRestrictions: true
};

const STORAGE_KEY = 'pet_policy_filters';

export function usePetPolicyFilters() {
  const [filters, setFilters] = useState<PetPolicyFilters>(DEFAULT_FILTERS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved filters from localStorage on component mount
  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem(STORAGE_KEY);
      if (savedFilters) {
        setFilters(JSON.parse(savedFilters));
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading saved filters:', error);
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

  // Update pet type filters
  const updatePetTypes = useCallback((types: PetTypeFilter[]) => {
    setFilters(prev => ({ ...prev, petTypes: types }));
  }, []);

  // Update travel method filter
  const updateTravelMethod = useCallback((method: TravelMethodFilter) => {
    setFilters(prev => ({ ...prev, travelMethod: method }));
  }, []);

  // Update weight filter
  const updateWeightFilter = useCallback((options: WeightFilterOptions) => {
    setFilters(prev => ({ ...prev, weight: { ...prev.weight, ...options } }));
  }, []);

  // Toggle show breed restrictions
  const toggleBreedRestrictions = useCallback((show: boolean) => {
    setFilters(prev => ({ ...prev, showBreedRestrictions: show }));
  }, []);

  // Reset all filters to default values
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    filters,
    isLoaded,
    updatePetTypes,
    updateTravelMethod,
    updateWeightFilter,
    toggleBreedRestrictions,
    resetFilters
  };
}
