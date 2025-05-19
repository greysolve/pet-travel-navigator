
import { useState, useCallback } from "react";
import { usePolicySearch } from "./usePolicySearch";
import { useRouteSearch } from "./useRouteSearch";
import { FlightData, PetPolicy } from "@/components/flight-results/types";
import { ApiProvider } from "@/config/feature-flags";
import { PetPolicyFilterParams } from "@/types/policy-filters";

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
  
  // Mock saveFlight function for the hooks
  const saveFlight = async (searchCriteria: any) => {
    // This will be replaced with the actual implementation from useSavedSearches
    return Promise.resolve();
  };

  // Use the policy search hook
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
    activeFilters,
    saveFlight
  });

  // Use the route search hook
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
    activeFilters,
    saveFlight
  });

  // Wrapper for policy search to check search count
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

  // Wrapper for route search to check search count
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
