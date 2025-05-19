import { useCallback, useState } from "react";
import { FlightData, PetPolicy, FlightLocation } from "@/components/flight-results/types";
import { Airline } from "@/types/policies";
import { useSavedSearches } from "./useSavedSearches";
import { useUserSearchCount } from "./useUserSearchCount";
import { ApiProvider } from "@/config/feature-flags";
import { supabase } from "@/integrations/supabase/client";
import { FilteredPolicyResult, PetPolicyFilterParams, TravelMethodFilter } from "@/types/policy-filters";

// Define interface for useSearchHandler parameters
interface UseSearchHandlerProps {
  user: any;
  toast: any;
  policySearch: string;
  origin: string;
  destination: string;
  date?: Date;
  passengers: number;
  shouldSaveSearch: boolean;
  setFlights: (flights: FlightData[]) => void;
  handleFlightSearch: (origin: string, destination: string, date: Date, policySearch: string, apiProvider?: ApiProvider) => Promise<FlightData[]>;
  onSearchResults: (flights: FlightData[], policies?: Record<string, PetPolicy>, provider?: string, apiError?: string) => void;
  apiProvider?: ApiProvider;
  enableFallback?: boolean;
  activeFilters?: PetPolicyFilterParams;
}

export const useSearchHandler = ({
  user,
  toast,
  policySearch,
  origin,
  destination,
  date,
  passengers,
  shouldSaveSearch,
  setFlights,
  handleFlightSearch,
  onSearchResults,
  apiProvider,
  enableFallback,
  activeFilters = {} as PetPolicyFilterParams
}: UseSearchHandlerProps) => {
  const { savedSearches, handleDeleteSearch, saveFlight } = useSavedSearches(user?.id);
  const { searchCount, isUnlimited, isLoading: isSearchCountLoading } = useUserSearchCount();
  const [isLoading, setIsLoading] = useState(false);

  // Function to filter pet policies based on active filters
  const filterPoliciesByActiveFilters = (policies: any) => {
    if (!activeFilters || Object.keys(activeFilters).length === 0) return policies;

    return Object.entries(policies).reduce((filteredPolicies: any, [airlineId, policy]: [string, any]) => {
      if (!policy) return filteredPolicies;
      
      // Check if the policy matches all active filters
      if (shouldIncludePolicy(policy)) {
        filteredPolicies[airlineId] = policy;
      }
      
      return filteredPolicies;
    }, {});
  };

  // Helper function to determine if a policy should be included based on filters
  const shouldIncludePolicy = (policy: any) => {
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
      // Check if the policy has weight restrictions that align with the filter
      const includesCarrier = activeFilters.weightIncludesCarrier || false;
      
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

  const handlePolicySearch = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search for airlines",
        variant: "destructive",
      });
      return;
    }

    if (searchCount === 0 && !isUnlimited) {
      toast({
        title: "Search limit reached",
        description: "You have reached your monthly search limit. Please upgrade your plan for more searches.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Search for airlines matching the query
      const { data: airlinesData, error: airlinesError } = await supabase
        .from('airlines')
        .select('id, iata_code, name')
        .textSearch('name', policySearch, {
          type: 'websearch',
          config: 'english'
        });

      if (airlinesError) {
        console.error("Error searching for airlines:", airlinesError);
        toast({
          title: "Search Error",
          description: "Error searching for airlines. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      const airlines = airlinesData || [];
      console.log("Airlines found:", airlines);

      if (airlines.length === 0) {
        setFlights([]);
        toast({
          title: "No airlines found",
          description: "No airlines match your search query.",
          variant: "destructive",
        });
        onSearchResults([], {}, apiProvider, undefined);
        return;
      }

      // Get airline IDs for policy lookup
      const airlineIds = airlines.map((airline: any) => airline.id);

      // Fetch pet policies for these airlines
      const { data: petPolicies, error: policiesError } = await supabase
        .from('pet_policies')
        .select('*')
        .in('airline_id', airlineIds);

      if (policiesError) {
        console.error("Error fetching pet policies:", policiesError);
        toast({
          title: "Search Error",
          description: "Error fetching airline pet policies. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log("Pet policies found:", petPolicies);

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

      // Apply filters to the policies
      const filteredPolicies = filterPoliciesByActiveFilters(airlinePolicies);

      // Create dummy flight results with the airlines - using FlightLocation objects for origin and destination
      const dummyFlights = airlines
        .filter((airline: any) => {
          // Only include airlines with policies that pass the filters
          return filteredPolicies[airline.id];
        })
        .map((airline: any) => {
          const flight: FlightData = {
            id: `policy_${airline.id}`,
            origin: {
              code: "POLICY"
            } as FlightLocation,
            destination: {
              code: "SEARCH"
            } as FlightLocation,
            departure_date: new Date().toISOString(),
            airline_id: airline.id,
            airline_code: airline.iata_code,
            airline_name: airline.name,
            flight_number: "",
            departure_time: "",
            arrival_time: "",
            duration: "",
            stops: 0,
            price: 0,
            isPolicySearch: true,
            segments: [],
            totalDuration: 0
          };
          
          return flight;
        });

      console.log("Generated flights:", dummyFlights);

      // Save the search if requested
      if (shouldSaveSearch && user) {
        await saveFlight({
          policySearch,
          origin: "",
          destination: "",
          date: undefined,
          passengers,
        });
      }

      setFlights(dummyFlights);
      onSearchResults(dummyFlights, filteredPolicies, apiProvider, undefined);

    } catch (error) {
      console.error("Unexpected error in policy search:", error);
      toast({
        title: "Search Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      onSearchResults([], {}, apiProvider, "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [
    user, 
    policySearch, 
    shouldSaveSearch, 
    toast, 
    setFlights, 
    onSearchResults, 
    searchCount, 
    isUnlimited, 
    passengers,
    saveFlight,
    activeFilters,
    apiProvider
  ]);
  
  const handleRouteSearch = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Date required",
        description: "Please select a travel date",
        variant: "destructive",
      });
      return;
    }

    if (searchCount === 0 && !isUnlimited) {
      toast({
        title: "Search limit reached",
        description: "You have reached your monthly search limit. Please upgrade your plan for more searches.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Perform flight search - pass empty string as policySearch
      const flights = await handleFlightSearch(origin, destination, date, "");
      
      // Save the search if requested
      if (shouldSaveSearch && user) {
        await saveFlight({
          policySearch: "",
          origin,
          destination,
          date: date.toISOString(),
          passengers,
        });
      }
      
      return flights;
    } catch (error: any) {
      console.error("Error in route search:", error);
      
      const errorMessage = error?.message || "An error occurred during search";
      
      toast({
        title: "Search Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Try fallback provider if enabled
      if (enableFallback && apiProvider === 'amadeus') {
        toast({
          title: "Trying alternate data source",
          description: "Searching with backup provider...",
        });
        
        try {
          const fallbackFlights = await handleFlightSearch(origin, destination, date, "", 'cirium');
          return fallbackFlights;
        } catch (fallbackError: any) {
          console.error("Fallback search also failed:", fallbackError);
          
          toast({
            title: "Search Failed",
            description: "Both search providers failed. Please try again later.",
            variant: "destructive",
          });
          onSearchResults([], {}, 'cirium', "Both search providers failed");
        }
      } else {
        onSearchResults([], {}, apiProvider, errorMessage);
      }
      
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [
    user, 
    origin, 
    destination, 
    date, 
    shouldSaveSearch, 
    handleFlightSearch, 
    toast, 
    searchCount, 
    isUnlimited,
    passengers,
    saveFlight,
    apiProvider,
    enableFallback,
    onSearchResults
  ]);

  return { 
    handlePolicySearch, 
    handleRouteSearch,
    isLoading 
  };
};
