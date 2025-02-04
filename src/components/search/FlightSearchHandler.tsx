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
      console.log('Sending search request with:', { origin, destination, date: date.toISOString() });
      
      const { data, error } = await supabase.functions.invoke('search_flight_schedules', {
        body: { origin, destination, date: date.toISOString() }
      });

      if (error) throw error;

      console.log('Full API response:', data);
      console.log('Response structure:', {
        hasConnections: !!data?.connections,
        hasScheduledFlights: !!data?.connections?.scheduledFlights,
        scheduledFlightsLength: data?.connections?.scheduledFlights?.length
      });
      
      if (data?.connections?.scheduledFlights) {
        const journeys = data.connections.scheduledFlights;
        console.log('Processed journeys:', journeys);
        onSearchResults(journeys);
      } else {
        console.log('No flights found in response');
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