
import { useState, useCallback, useEffect } from 'react';
import { 
  PetTypeFilter, 
  TravelMethodFilter, 
  WeightFilterOptions, 
  PetPolicyFilterParams,
  FilteredPolicyResult
} from '@/types/policy-filters';
import { supabase } from '@/integrations/supabase/client';
import { filterPoliciesByActiveFilters } from '@/components/search/hooks/utils/policyFilterUtils';

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

  // Apply filters using client-side filtering (same pattern as usePolicySearch)
  const applyFilters = useCallback(async (filterParams: PetPolicyFilterParams) => {
    setIsFiltering(true);
    setFilterError(null);
    
    try {
      // Update local filters state
      setFilters(filterParams);
      
      console.log('Applying filters with client-side filtering:', filterParams);
      
      // Fetch all airlines first
      const { data: airlinesData, error: airlinesError } = await supabase
        .from('airlines')
        .select('id, iata_code, name')
        .eq('active', true);

      if (airlinesError) {
        console.error("Error fetching airlines:", airlinesError);
        setFilterError("Error fetching airlines data");
        setFilteredPolicies([]);
        return [];
      }
      
      const airlines = airlinesData || [];
      console.log("Airlines found:", airlines.length);

      if (airlines.length === 0) {
        setFilteredPolicies([]);
        return [];
      }

      // Get airline IDs for policy lookup
      const airlineIds = airlines.map((airline: any) => airline.id);

      // Fetch pet policies for all airlines
      const { data: petPolicies, error: policiesError } = await supabase
        .from('pet_policies')
        .select('*')
        .in('airline_id', airlineIds);

      if (policiesError) {
        console.error("Error fetching pet policies:", policiesError);
        setFilterError("Error fetching pet policies");
        setFilteredPolicies([]);
        return [];
      }

      console.log("Pet policies found:", petPolicies?.length || 0);

      // Create a mapping of airline ID to pet policy
      const airlinePolicies = (petPolicies || []).reduce((acc: Record<string, any>, policy: any) => {
        if (policy.airline_id) {
          // Find the airline that owns this policy
          const airline = airlines.find((a: any) => a.id === policy.airline_id);
          if (airline) {
            acc[airline.id] = {
              ...policy,
              airline_id: airline.id,
              airline_code: airline.iata_code,
              airline_name: airline.name,
            };
          }
        }
        return acc;
      }, {});

      console.log("Created airline policies mapping:", Object.keys(airlinePolicies).length);

      // Apply filters to the policies using existing client-side logic
      const filteredPolicies = filterPoliciesByActiveFilters(airlinePolicies, filterParams);

      console.log("Filtered policies:", Object.keys(filteredPolicies).length);

      // Convert filtered policies to FilteredPolicyResult format
      const results: FilteredPolicyResult[] = Object.entries(filteredPolicies).map(([airlineId, policy]: [string, any]) => {
        const airline = airlines.find((a: any) => a.id === airlineId);
        
        // Generate match reasons based on applied filters
        const matchReasons: string[] = [];
        
        if (filterParams.petTypes && filterParams.petTypes.length > 0) {
          matchReasons.push(`Supports ${filterParams.petTypes.join(', ')}`);
        }
        
        if (filterParams.travelMethod) {
          const methods = [];
          if (filterParams.travelMethod.cabin) methods.push('cabin');
          if (filterParams.travelMethod.cargo) methods.push('cargo');
          if (methods.length > 0) {
            matchReasons.push(`Allows ${methods.join(' and ')} travel`);
          }
        }
        
        if (filterParams.maxWeight) {
          matchReasons.push(`Supports pets up to ${filterParams.maxWeight}kg`);
        }
        
        if (filterParams.includeBreedRestrictions === false) {
          matchReasons.push('No breed restrictions');
        }
        
        if (matchReasons.length === 0) {
          matchReasons.push('Matches filter criteria');
        }

        return {
          airlineId: airlineId,
          airlineCode: airline?.iata_code || 'Unknown',
          airlineName: airline?.name || 'Unknown Airline',
          matchReason: matchReasons
        };
      });
      
      setFilteredPolicies(results);
      return results;
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
