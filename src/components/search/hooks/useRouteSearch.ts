
import { useCallback } from "react";
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
  handleFlightSearch: (origin: string, destination: string, date: Date, policySearch: string, apiProvider?: ApiProvider, activeFilters?: PetPolicyFilterParams) => Promise<FlightData[]>;
  onSearchResults: (flights: FlightData[], policies?: Record<string, PetPolicy>, provider?: string, apiError?: string) => void;
  apiProvider?: ApiProvider;
  enableFallback?: boolean;
  activeFilters?: PetPolicyFilterParams;
  saveFlight: (searchCriteria: any) => Promise<void>;
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
  saveFlight
}: UseRouteSearchProps) => {
  
  const handleRouteSearch = useCallback(async () => {
    if (!origin || !destination || !date) {
      toast({
        title: "Missing information",
        description: "Please enter origin, destination, and travel date",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log(`Starting route search from ${origin} to ${destination} on ${date.toISOString()}`);
      
      // Call flight search with client-side filtering
      const flights = await handleFlightSearch(
        origin,
        destination,
        date,
        "", // empty policy search for route searches
        apiProvider,
        activeFilters // This will be applied client-side in handleFlightSearch
      );

      console.log(`Route search completed with ${flights.length} flights found`);

      // Save the search if requested
      if (shouldSaveSearch && user?.id) {
        try {
          await saveFlight({
            user_id: user.id,
            origin,
            destination,
            date: date.toISOString().split('T')[0],
            passengers,
            search_type: 'route'
          });
          console.log('Route search saved successfully');
        } catch (saveError) {
          console.error('Error saving route search:', saveError);
          // Don't throw here - we still want to show results even if saving fails
        }
      }

      // Call the results handler
      onSearchResults(flights, {}, apiProvider || 'Unknown');

    } catch (error: any) {
      console.error("Route search error:", error);
      
      // If fallback is enabled and we're not already using the fallback provider, try again
      if (enableFallback && apiProvider !== "amadeus") {
        console.log("Trying fallback provider...");
        try {
          const fallbackFlights = await handleFlightSearch(
            origin,
            destination,
            date,
            "",
            "amadeus", // Use amadeus as fallback
            activeFilters
          );
          
          console.log(`Fallback search completed with ${fallbackFlights.length} flights found`);
          onSearchResults(fallbackFlights, {}, "amadeus (fallback)", error.message);
          return;
        } catch (fallbackError) {
          console.error("Fallback search also failed:", fallbackError);
        }
      }
      
      // Show error to user
      toast({
        title: "Search failed",
        description: error.message || "Failed to search for flights. Please try again.",
        variant: "destructive",
      });
      
      // Still call onSearchResults with empty results and error info
      onSearchResults([], {}, apiProvider || 'Unknown', error.message);
    }
  }, [origin, destination, date, passengers, shouldSaveSearch, handleFlightSearch, onSearchResults, apiProvider, enableFallback, activeFilters, saveFlight, user, toast]);

  return {
    handleRouteSearch,
    isLoading: false // This hook doesn't manage its own loading state
  };
};
