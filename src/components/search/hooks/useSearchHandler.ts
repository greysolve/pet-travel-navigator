
import { useState, useCallback } from "react";
import { usePolicySearch } from "./usePolicySearch";
import { useRouteSearch } from "./useRouteSearch";
import { FlightData, PetPolicy } from "@/components/flight-results/types";
import { ApiProvider } from "@/config/feature-flags";
import { PetPolicyFilterParams } from "@/types/policy-filters";
import { useSaveSearch } from "./useSaveSearch";
import { supabase } from "@/integrations/supabase/client";

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
  handleFlightSearch: (origin: string, destination: string, date: Date, policySearch: string, apiProvider?: ApiProvider, activeFilters?: PetPolicyFilterParams) => Promise<FlightData[]>;
  onSearchResults: (flights: FlightData[], policies?: Record<string, PetPolicy>, provider?: string, apiError?: string) => void;
  apiProvider?: ApiProvider;
  enableFallback?: boolean;
  activeFilters?: PetPolicyFilterParams;
  searchCount?: number;
  isUnlimited?: boolean;
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
  activeFilters = {} as PetPolicyFilterParams,
  searchCount,
  isUnlimited
}: UseSearchHandlerProps) => {
  // Common loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Use the save search hook
  const { saveSearch } = useSaveSearch({
    userId: user?.id,
  });

  // Enhanced saveFlight function that includes advanced filters
  const saveFlight = async (searchCriteria: any) => {
    if (!shouldSaveSearch || !user?.id) return Promise.resolve();

    try {
      // Save to route_searches for search count tracking
      const { error: routeError } = await supabase
        .from('route_searches')
        .insert({
          user_id: user.id,
          origin: searchCriteria.origin,
          destination: searchCriteria.destination,
          search_date: searchCriteria.date,
        });

      if (routeError) {
        console.error("Error saving route search:", routeError);
      }

      // Also save as a named search with filters
      await saveSearch(
        {
          origin: searchCriteria.origin,
          destination: searchCriteria.destination,
          date: searchCriteria.date ? new Date(searchCriteria.date) : undefined,
          policySearch: searchCriteria.search_type === 'policy' ? policySearch : '',
          passengers: searchCriteria.passengers || passengers,
          search_type: searchCriteria.search_type
        },
        activeFilters
      );

      return Promise.resolve();
    } catch (error) {
      console.error("Error in saveFlight:", error);
      return Promise.resolve();
    }
  };

  // Use the policy search hook - now passes activeFilters for client-side filtering
  const { 
    handlePolicySearch: policySearchHandler,
    isLoading: isPolicySearchLoading 
  } = usePolicySearch({
    user,
    toast,
    policySearch,
    passengers,
    shouldSaveSearch,
    setFlights,
    onSearchResults,
    apiProvider,
    activeFilters, // Pass filters for client-side filtering
    saveFlight
  });

  // Use the route search hook - now passes activeFilters for client-side filtering
  const {
    handleRouteSearch: routeSearchHandler,
    isLoading: isRouteSearchLoading
  } = useRouteSearch({
    user,
    toast,
    origin,
    destination,
    date,
    passengers,
    shouldSaveSearch,
    handleFlightSearch,
    onSearchResults,
    apiProvider,
    enableFallback,
    activeFilters, // Pass filters for client-side filtering
    saveFlight
  });

  // Wrapper for policy search to check search count and save if needed
  const handlePolicySearch = async () => {
    if (searchCount === 0 && !isUnlimited) {
      toast({
        title: "Search limit reached",
        description: "You have reached your monthly search limit. Please upgrade your plan for more searches.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    await policySearchHandler();
    setIsLoading(false);
  };

  // Wrapper for route search to check search count and save if needed
  const handleRouteSearch = async () => {
    if (searchCount === 0 && !isUnlimited) {
      toast({
        title: "Search limit reached",
        description: "You have reached your monthly search limit. Please upgrade your plan for more searches.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    await routeSearchHandler();
    setIsLoading(false);
  };

  return { 
    handlePolicySearch, 
    handleRouteSearch,
    isLoading: isLoading || isPolicySearchLoading || isRouteSearchLoading
  };
};
