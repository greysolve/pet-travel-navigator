
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FlightData } from "@/components/flight-results/types";
import { ApiProvider } from "@/config/feature-flags";

export const useFlightSearch = () => {
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  /**
   * Handles the flight search operation
   * @param origin The departure airport code
   * @param destination The arrival airport code
   * @param date The departure date
   * @param policySearch Optional policy search parameter
   * @param apiProvider Optional API provider to use
   * @returns Promise containing flight data
   */
  const handleFlightSearch = async (
    origin: string,
    destination: string,
    date: Date,
    policySearch: string = "",
    apiProvider?: ApiProvider
  ): Promise<FlightData[]> => {
    setIsSearchLoading(true);

    try {
      console.log(`Searching for flights from ${origin} to ${destination} on ${date}`);
      
      // Format search parameters
      const formattedDate = date.toISOString().split('T')[0];
      
      // Call Supabase edge function with optional provider
      const { data, error } = await supabase.functions.invoke('search_flight_schedules_v2', {
        body: { 
          origin, 
          destination, 
          date: formattedDate,
          provider: apiProvider 
        }
      });
      
      if (error) {
        console.error("Flight search error:", error);
        throw new Error(`Search error: ${error.message || "Failed to fetch flights"}`);
      }
      
      if (!data || !data.flights || data.flights.length === 0) {
        return [];
      }
      
      // Transform the flight data while preserving the segments array
      return data.flights.map((flight: any) => ({
        id: flight.id,
        origin: flight.origin || origin,
        destination: flight.destination || destination,
        departure_date: flight.departure_date || formattedDate,
        airline_id: flight.airline_id || flight.carrierCode,
        airline_code: flight.airline_code || flight.carrierCode,
        airline_name: flight.airline_name || flight.airlineName,
        flight_number: flight.flight_number || flight.flightNumber || "",
        departure_time: flight.departure_time || flight.departureTime || "",
        arrival_time: flight.arrival_time || flight.arrivalTime || "",
        duration: flight.duration || "",
        stops: flight.stops || 0,
        price: flight.price || 0,
        // Preserve the segments array which is needed by FlightResults component
        segments: flight.segments || [],
        // Preserve totalDuration which might be used for calculations
        totalDuration: flight.totalDuration || 0,
      }));
    } catch (error: any) {
      console.error("Error in flight search:", error);
      throw error;
    } finally {
      setIsSearchLoading(false);
    }
  };

  return { isSearchLoading, handleFlightSearch };
};
