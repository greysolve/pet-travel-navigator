import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { FlightJourney, FlightSegment } from "../flight-results/types";

interface FlightSearchHandlerProps {
  origin: string;
  destination: string;
  date: Date | undefined;
  destinationCountry: string | undefined;
  onSearchResults: (flights: FlightJourney[]) => void;
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
      
      if (data && data.connections) {
        const processedJourneys = data.connections.map((connection: any) => {
          const segments = connection.scheduledFlight.map((flight: any) => ({
            carrierFsCode: flight.carrierFsCode,
            flightNumber: flight.flightNumber,
            departureTime: flight.departureTime,
            arrivalTime: flight.arrivalTime,
            departureAirportFsCode: flight.departureAirportFsCode,
            arrivalAirportFsCode: flight.arrivalAirportFsCode,
            departureTerminal: flight.departureTerminal,
            arrivalTerminal: flight.arrivalTerminal,
            stops: flight.stops,
            elapsedTime: flight.elapsedTime,
            isCodeshare: flight.isCodeshare,
            codeshares: flight.codeshares,
          }));

          const totalDuration = segments.reduce((total: number, segment: FlightSegment) => 
            total + segment.elapsedTime, 0);

          return {
            segments,
            totalDuration,
            stops: segments.length - 1,
            arrivalCountry: destinationCountry,
          };
        });

        onSearchResults(processedJourneys);
      } else {
        onSearchResults([]);
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