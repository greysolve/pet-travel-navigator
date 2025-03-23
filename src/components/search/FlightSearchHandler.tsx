
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FlightData, PetPolicy } from "../flight-results/types";

export const useFlightSearch = () => {
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchCount, setSearchCount] = useState<number>(0);
  const [isPetCaddie, setIsPetCaddie] = useState(false);

  const handleFlightSearch = async (
    origin: string, 
    destination: string, 
    date: Date,
    onSearchResults?: (flights: FlightData[], policies?: Record<string, PetPolicy>) => void,
    onSearchComplete?: () => void
  ): Promise<FlightData[]> => {
    setIsSearchLoading(true);
    try {
      console.log('Searching flights:', { origin, destination, date });
      const { data: flightData, error } = await supabase.functions.invoke('search_flight_schedules', {
        body: JSON.stringify({
          origin,
          destination,
          date: date.toISOString(),
        }),
      });

      if (error) {
        console.error('Error fetching flights:', error);
        throw error;
      }

      console.log('Raw flight data received:', flightData);
      
      // Check if connections property exists
      if (!flightData.connections) {
        console.error('No connections property in flightData:', flightData);
        return [];
      }

      // Ensure each flight segment has the airline name
      const processedFlights = flightData.connections.map((flight: FlightData) => {
        console.log('Processing flight:', flight);
        return {
          ...flight,
          segments: flight.segments?.map(segment => ({
            ...segment,
            airlineName: segment.airlineName || `${segment.carrierFsCode} Airlines` // Fallback if name not provided
          }))
        };
      });

      console.log('Processed flights with airline names:', processedFlights);
      
      // Call the callback if provided
      if (onSearchResults) {
        console.log('Calling onSearchResults with processed flights');
        onSearchResults(processedFlights);
      }
      
      if (onSearchComplete) {
        onSearchComplete();
      }
      
      return processedFlights;
    } catch (error) {
      console.error('Flight search error:', error);
      throw error;
    } finally {
      setIsSearchLoading(false);
    }
  };

  return {
    isSearchLoading,
    searchCount,
    isPetCaddie,
    handleFlightSearch,
  };
};
