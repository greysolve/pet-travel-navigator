
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { usePlanDetails } from "./usePlanDetails";
import { useSearchCount } from "./useSearchCount";
import { DEFAULT_API_PROVIDER, ApiProvider } from "@/config/feature-flags";
import type { FlightData } from "../../flight-results/types";

interface UseFlightSearchReturn {
  isSearchLoading: boolean;
  searchCount: number | undefined;
  isPetCaddie: boolean;
  handleFlightSearch: (
    origin: string, 
    destination: string, 
    date: Date, 
    onResults: (results: FlightData[], policies?: Record<string, any>, apiError?: string) => void,
    onComplete?: () => void,
    apiProvider?: ApiProvider,
    enableFallback?: boolean
  ) => Promise<FlightData[]>;
}

export const useFlightSearch = (): UseFlightSearchReturn => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const isPetCaddie = profile?.userRole === 'pet_caddie';
  const { planDetails } = usePlanDetails(profile?.plan);
  const { searchCount, decrementSearchCount } = useSearchCount(profile);

  const handleFlightSearch = async (
    origin: string, 
    destination: string, 
    date: Date,
    onResults: (results: FlightData[], policies?: Record<string, any>, apiError?: string) => void,
    onComplete?: () => void,
    requestedApiProvider?: ApiProvider,
    enableFallback?: boolean
  ) => {
    if (!profile) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search",
        variant: "destructive",
      });
      return [];
    }

    if (isPetCaddie) {
      const isUnlimited = planDetails?.is_search_unlimited;
      
      if (!isUnlimited && (profile.search_count === undefined || profile.search_count <= 0)) {
        toast({
          title: "No searches remaining",
          description: "You have reached your search limit. Please upgrade your plan.",
          variant: "destructive",
        });
        return [];
      }
    }

    setIsSearchLoading(true);
    try {
      // Use the provided API provider or fall back to the default
      const selectedApiProvider = requestedApiProvider || DEFAULT_API_PROVIDER;
      console.log('Calling flight search with:', { 
        origin, 
        destination, 
        date, 
        apiProvider: selectedApiProvider,
        enableFallback
      });
      
      if (isPetCaddie && !planDetails?.is_search_unlimited) {
        const decremented = await decrementSearchCount();
        if (!decremented) {
          setIsSearchLoading(false);
          return [];
        }
      }
      
      // Call the search function
      const { data, error } = await supabase.functions.invoke('search_flight_schedules_v2', {
        body: {
          origin,
          destination,
          date: date.toISOString(),
          api: selectedApiProvider,
          enable_fallback: enableFallback
        },
      });

      if (error) {
        console.error('Error calling flight search:', error);
        toast({
          title: "Search failed",
          description: "There was an error fetching flight data. Please try again.",
          variant: "destructive",
        });
        return [];
      }

      console.log('Received flight search results:', data);
      
      const flights = data?.connections || [];
      const responseApiProvider = data?.api_provider;
      const apiError = data?.error;
      const fallbackError = data?.fallback_error;
      const fallbackUsed = data?.fallback_used;
      
      if (responseApiProvider) {
        console.log(`Flight data provided by: ${responseApiProvider} API${fallbackUsed ? ' (Fallback)' : ''}`);
      }
      
      if (apiError) {
        console.warn(`API error: ${apiError}${fallbackError ? `, Fallback error: ${fallbackError}` : ''}`);
        
        // If we have flights but also an error, it means fallback worked but primary failed
        if (flights.length > 0) {
          toast({
            title: `Warning: Primary API (${selectedApiProvider}) failed`,
            description: `Using fallback data from ${responseApiProvider}. Error: ${apiError}`,
            variant: "warning",
          });
        } else {
          // Both APIs failed or fallback was disabled
          toast({
            title: "Search failed",
            description: fallbackError 
              ? `Both APIs failed. Primary: ${apiError}, Fallback: ${fallbackError}` 
              : `API error: ${apiError}`,
            variant: "destructive",
          });
        }
      }
      
      if (onResults) {
        onResults(flights, {}, apiError);
      }
      
      return flights;
    } catch (error) {
      console.error('Error in flight search:', error);
      toast({
        title: "Search failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsSearchLoading(false);
      if (onComplete) {
        onComplete();
      }
    }
  };

  return {
    isSearchLoading,
    searchCount,
    isPetCaddie,
    handleFlightSearch,
  };
};
