
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSearchCount } from "./useSearchCount";
import { ApiProvider } from "@/config/feature-flags";
import type { FlightData } from "@/components/flight-results/types";
import { useAuth } from "@/contexts/auth/AuthContext";
import { useUser } from "@/contexts/user/UserContext";

export const useFlightSearch = () => {
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchAttempts, setSearchAttempts] = useState(0);
  const { user } = useAuth();
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
      
      // Try primary API provider (or default if not specified)
      const primaryProvider = apiProvider || "cirium";
      
      let searchPath: string;
      if (primaryProvider === "cirium") {
        // Use Cirium API endpoint (FIXED: removed /api prefix)
        searchPath = "search_flight_schedules_v2/cirium";
      } else if (primaryProvider === "amadeus") {
        // Use Amadeus API endpoint (FIXED: removed /api prefix)
        searchPath = "search_flight_schedules_v2/amadeus";
      } else {
        // Use unified API endpoint for other providers (FIXED: removed /api prefix)
        searchPath = "search_flight_schedules_v2";
      }
      
      console.log(`Using search path: ${searchPath}`);
      
      // Make the API request
      const { data: flightData, error } = await supabase.functions.invoke(searchPath, {
        body: {
          origin,
          destination,
          date: formattedDate,
          provider: primaryProvider,
          passengers
        }
      });
      
      console.log("API response:", { data: flightData, error });
      
      // Handle the response
      if (error) {
        console.error("Flight search error:", error);
        throw new Error(error.message);
      }
      
      if (flightData && flightData.flights && flightData.flights.length > 0) {
        console.log(`Found ${flightData.flights.length} flights with ${primaryProvider}`);
        
        // If successful, increment search count
        await incrementSearchCount();
        
        // Return the flights
        onResults(flightData.flights, flightData.policies, primaryProvider, null);
        if (onComplete) onComplete();
        setIsSearchLoading(false);
        return flightData.flights;
      } else if (flightData && flightData.connections && flightData.connections.length > 0) {
        // Handle response format from the v2 endpoint which uses "connections" instead of "flights"
        console.log(`Found ${flightData.connections.length} connections with ${primaryProvider}`);
        
        // If successful, increment search count
        await incrementSearchCount();
        
        // Return the connections as flights
        onResults(flightData.connections, flightData.policies, primaryProvider, null);
        if (onComplete) onComplete();
        setIsSearchLoading(false);
        return flightData.connections;
      }
      
      // If no flights found with primary provider and fallback is enabled, try secondary
      if (enableFallback && primaryProvider !== "amadeus") {
        console.log("No flights found with primary provider, trying Amadeus fallback");
        
        // FIXED: removed /api prefix
        const fallbackPath = "search_flight_schedules_v2/amadeus";
        console.log(`Using fallback path: ${fallbackPath}`);
        
        const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke(fallbackPath, {
          body: {
            origin,
            destination,
            date: formattedDate,
            passengers
          }
        });
        
        console.log("Fallback API response:", { data: fallbackData, error: fallbackError });
        
        if (fallbackError) {
          console.error("Fallback search error:", fallbackError);
          throw new Error(fallbackError.message);
        }
        
        if (fallbackData && fallbackData.flights && fallbackData.flights.length > 0) {
          console.log(`Found ${fallbackData.flights.length} flights with Amadeus fallback`);
          
          // If successful, increment search count
          await incrementSearchCount();
          
          // Return the flights
          onResults(fallbackData.flights, fallbackData.policies, "amadeus", null);
          if (onComplete) onComplete();
          setIsSearchLoading(false);
          return fallbackData.flights;
        } else if (fallbackData && fallbackData.connections && fallbackData.connections.length > 0) {
          console.log(`Found ${fallbackData.connections.length} connections with Amadeus fallback`);
          
          // If successful, increment search count
          await incrementSearchCount();
          
          // Return the connections as flights
          onResults(fallbackData.connections, fallbackData.policies, "amadeus", null);
          if (onComplete) onComplete();
          setIsSearchLoading(false);
          return fallbackData.connections;
        }
      }
      
      // If we get here, no flights were found with any provider
      console.log("No flights found with any provider");
      onResults([], {}, primaryProvider, "No flights found for this route and date");
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
