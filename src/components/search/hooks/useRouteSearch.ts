
import { useState, useCallback } from "react";
import { FlightData, PetPolicy } from "@/components/flight-results/types";
import { ApiProvider } from "@/config/feature-flags";
import { PetPolicyFilterParams } from "@/types/policy-filters";

interface UseRouteSearchProps {
  user: any;
  toast: any;
  origin: string;
  destination: string;
  date?: Date;
  passengers: number;
  shouldSaveSearch: boolean;
  handleFlightSearch: (origin: string, destination: string, date: Date, policySearch: string, apiProvider?: ApiProvider, activeFilters?: PetPolicyFilterParams, allowedAirlineCodes?: string[]) => Promise<FlightData[]>;
  onSearchResults: (flights: FlightData[], policies?: Record<string, PetPolicy>, provider?: string, apiError?: string) => void;
  apiProvider?: ApiProvider;
  enableFallback?: boolean;
  activeFilters?: PetPolicyFilterParams;
  saveFlight: (searchCriteria: any) => Promise<void>;
  getFilteredAirlineCodes?: () => Promise<string[]>;
}

export const useRouteSearch = ({
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
  saveFlight,
  getFilteredAirlineCodes
}: UseRouteSearchProps) => {
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);

    try {
      // Get filtered airline codes if filters are applied
      let allowedAirlineCodes: string[] = [];
      if (getFilteredAirlineCodes && activeFilters && Object.keys(activeFilters).length > 0) {
        console.log("Getting pre-filtered airline codes for route search");
        allowedAirlineCodes = await getFilteredAirlineCodes();
        console.log(`Pre-filtered airlines: ${allowedAirlineCodes.length} airlines match the criteria`);
      }
      
      // Perform flight search with the filtered airline codes
      const flights = await handleFlightSearch(
        origin, 
        destination, 
        date, 
        "", 
        apiProvider, 
        activeFilters, 
        allowedAirlineCodes
      );
      
      // Save the search if requested
      if (shouldSaveSearch && user) {
        await saveFlight({
          policySearch: "",
          origin,
          destination,
          date: date.toISOString(),
          passengers,
          filters: activeFilters // Save filters with the search
        });
      }
      
      // Call onSearchResults with proper arguments
      onSearchResults(flights, {}, apiProvider, undefined);
      
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
          // Get filtered airline codes again for fallback provider
          let allowedAirlineCodes: string[] = [];
          if (getFilteredAirlineCodes && activeFilters && Object.keys(activeFilters).length > 0) {
            allowedAirlineCodes = await getFilteredAirlineCodes();
          }
          
          const fallbackFlights = await handleFlightSearch(
            origin, 
            destination, 
            date, 
            "", 
            'cirium', 
            activeFilters,
            allowedAirlineCodes
          );
          
          onSearchResults(fallbackFlights, {}, 'cirium', undefined);
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
    passengers,
    saveFlight,
    apiProvider,
    enableFallback,
    onSearchResults,
    activeFilters,
    getFilteredAirlineCodes
  ]);

  return {
    handleRouteSearch,
    isLoading
  };
};
