
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSearchCount } from "./useSearchCount";
import { ApiProvider } from "@/config/feature-flags";
import type { FlightData } from "@/components/flight-results/types";
import { useUser } from "@/contexts/user/UserContext";

export const useFlightSearch = () => {
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchAttempts, setSearchAttempts] = useState(0);
  const { user } = useUser();
  const { profile } = useUser();
  const { data: searchCount, refetch: refetchSearchCount } = useSearchCount(user?.id);

  // Admin users are always treated as pet caddies
  // Regular users are considered pet caddies if they have a plan
  const isPetCaddie = !!profile?.plan || profile?.userRole === 'site_manager';

  /**
   * Handle flight search by calling the appropriate API based on provider
   */
  const handleFlightSearch = async (
    origin: string,
    destination: string,
    date: Date,
    onResults: (flights: FlightData[], policies?: Record<string, any>, apiProvider?: string, apiError?: string) => void,
    onComplete?: () => void,
    apiProvider?: ApiProvider,
    enableFallback: boolean = false,
    passengers: number = 1
  ): Promise<FlightData[]> => {
    setIsSearchLoading(true);
    setApiError(null);
    setSearchAttempts(prev => prev + 1);
    
    try {
      console.log(`Searching flights from ${origin} to ${destination} on ${date.toISOString()}`);
      console.log("API Provider:", apiProvider || "Default");
      console.log("Fallback enabled:", enableFallback);
      console.log("Passengers:", passengers);
      
      // Format date to YYYY-MM-DD for API
      const formattedDate = date.toISOString().split('T')[0];
      
      // Use the main endpoint that handles provider selection
      const searchPath = "search_flight_schedules_v2";
      
      console.log(`Using search path: ${searchPath}`);
      
      // Make the API request with provider preference and web search in the payload
      const { data: flightData, error } = await supabase.functions.invoke(searchPath, {
        body: {
          origin,
          destination,
          date: formattedDate,
          api: apiProvider, // Pass the preferred provider to the main endpoint
          enable_fallback: enableFallback,
          passengers,
          use_web_search: true, // Enable web search for this request
        }
      });
      
      console.log("API response:", { data: flightData, error });
      
      // Handle the response
      if (error) {
        console.error("Flight search error:", error);
        throw new Error(error.message);
      }
      
      // Check for flights using the standard format
      if (flightData && flightData.flights && flightData.flights.length > 0) {
        console.log(`Found ${flightData.flights.length} flights with provider: ${flightData.api_provider}`);
        
        // If successful, increment search count
        await incrementSearchCount();
        
        // Return the flights
        onResults(flightData.flights, flightData.policies, flightData.api_provider, null);
        if (onComplete) onComplete();
        setIsSearchLoading(false);
        return flightData.flights;
      } 
      // Check for flights using connections property (for backward compatibility)
      else if (flightData && flightData.connections && flightData.connections.length > 0) {
        console.log(`Found ${flightData.connections.length} connections with provider: ${flightData.api_provider}`);
        
        // If successful, increment search count
        await incrementSearchCount();
        
        // Return the connections as flights
        onResults(flightData.connections, flightData.policies, flightData.api_provider, null);
        if (onComplete) onComplete();
        setIsSearchLoading(false);
        return flightData.connections;
      }
      
      // If we get here, no flights were found with any provider
      console.log("No flights found with any provider");
      const actualProvider = flightData?.api_provider || apiProvider || "unknown";
      onResults([], {}, actualProvider, "No flights found for this route and date");
      if (onComplete) onComplete();
      setIsSearchLoading(false);
      return [];
      
    } catch (error: any) {
      console.error("Flight search error:", error);
      const errorMessage = error.message || "Failed to search flights";
      setApiError(errorMessage);
      onResults([], {}, apiProvider, errorMessage);
      if (onComplete) onComplete();
      setIsSearchLoading(false);
      return [];
    }
  };
  
  const incrementSearchCount = async () => {
    // Don't increment search count for admin users
    if (profile?.userRole === 'site_manager') {
      console.log("Search count not incremented for admin user");
      return;
    }
    
    try {
      console.log("Incrementing search count");
      await refetchSearchCount();
    } catch (error) {
      console.error("Error incrementing search count:", error);
    }
  };

  return {
    isSearchLoading,
    searchCount,
    apiError,
    isPetCaddie,
    searchAttempts,
    handleFlightSearch,
  };
};
