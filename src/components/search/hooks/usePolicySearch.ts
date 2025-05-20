
import { useState, useCallback } from "react";
import { FlightData, PetPolicy, FlightLocation } from "@/components/flight-results/types";
import { supabase } from "@/integrations/supabase/client";
import { filterPoliciesByActiveFilters } from "./utils/policyFilterUtils";
import { PetPolicyFilterParams } from "@/types/policy-filters";

interface UsePolicySearchProps {
  user: any;
  toast: any;
  policySearch: string;
  passengers: number;
  shouldSaveSearch: boolean;
  setFlights: (flights: FlightData[]) => void;
  onSearchResults: (flights: FlightData[], policies?: Record<string, PetPolicy>, provider?: string, apiError?: string) => void;
  apiProvider?: string;
  activeFilters?: PetPolicyFilterParams;
  saveFlight: (searchCriteria: any) => Promise<void>;
}

export const usePolicySearch = ({
  user,
  toast,
  policySearch,
  passengers,
  shouldSaveSearch,
  setFlights,
  onSearchResults,
  apiProvider,
  activeFilters = {},
  saveFlight
}: UsePolicySearchProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePolicySearch = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search for airlines",
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
        onSearchResults([], {}, apiProvider, "Error searching for airlines");
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
        onSearchResults([], {}, apiProvider, "No airlines found");
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
        onSearchResults([], {}, apiProvider, "Error fetching pet policies");
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
      const filteredPolicies = filterPoliciesByActiveFilters(airlinePolicies, activeFilters);

      // Generate dummy flight results with the airlines - using FlightLocation objects for origin and destination
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
    passengers,
    saveFlight,
    activeFilters,
    apiProvider
  ]);

  return {
    handlePolicySearch,
    isLoading
  };
};
