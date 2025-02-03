import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { FlightData } from "../flight-results/types";

interface FlightSearchHandlerProps {
  origin: string;
  destination: string;
  date: Date | undefined;
  destinationCountry: string | undefined;
  onSearchResults: (flights: FlightData[]) => void;
  onSearchComplete: () => void;
}

export const useFlightSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFlightSearch = async ({
    origin,
    destination,
    date,
    destinationCountry,
    onSearchResults,
    onSearchComplete,
  }: FlightSearchHandlerProps) => {
    if (!origin || !destination || !date) {
      toast({
        title: "Missing search criteria",
        description: "Please provide origin, destination, and date.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search_flight_schedules', {
        body: { origin, destination, date: date.toISOString() }
      });

      if (error) throw error;

      console.log('Flight schedules:', data);
      
      if (data && data.scheduledFlights) {
        const airlineMap = data.appendix?.airlines?.reduce((acc: Record<string, string>, airline: any) => {
          acc[airline.fs] = airline.name;
          return acc;
        }, {}) || {};

        const flights = data.scheduledFlights.map((flight: any) => ({
          carrierFsCode: flight.carrierFsCode,
          flightNumber: flight.flightNumber,
          departureTime: flight.departureTime,
          arrivalTime: flight.arrivalTime,
          arrivalCountry: destinationCountry,
          airlineName: airlineMap[flight.carrierFsCode],
        }));
        onSearchResults(flights);
      }
    } catch (error) {
      console.error('Error searching flights:', error);
      toast({
        title: "Error searching flights",
        description: "There was an error searching for flights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      onSearchComplete();
    }
  };

  return { handleFlightSearch, isLoading };
};