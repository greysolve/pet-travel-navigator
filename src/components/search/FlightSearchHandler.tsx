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

        // Process flights and their connections
        const processedFlights = data.scheduledFlights.reduce((acc: FlightData[], flight: any) => {
          if (flight.codeshares) {
            // Create a main flight with its connections
            const mainFlight: FlightData = {
              carrierFsCode: flight.carrierFsCode,
              flightNumber: flight.flightNumber,
              departureTime: flight.departureTime,
              arrivalTime: flight.arrivalTime,
              arrivalCountry: destinationCountry,
              airlineName: airlineMap[flight.carrierFsCode],
              departureAirport: flight.departureAirportFsCode,
              arrivalAirport: flight.arrivalAirportFsCode,
              connections: flight.codeshares.map((codeshare: any) => ({
                carrierFsCode: codeshare.carrierFsCode,
                flightNumber: codeshare.flightNumber,
                departureTime: codeshare.departureTime,
                arrivalTime: codeshare.arrivalTime,
                arrivalCountry: destinationCountry,
                airlineName: airlineMap[codeshare.carrierFsCode],
                departureAirport: codeshare.departureAirportFsCode,
                arrivalAirport: codeshare.arrivalAirportFsCode,
                isConnection: true
              }))
            };
            acc.push(mainFlight);
          } else if (!flight.isCodeshare) {
            // Add direct flights
            acc.push({
              carrierFsCode: flight.carrierFsCode,
              flightNumber: flight.flightNumber,
              departureTime: flight.departureTime,
              arrivalTime: flight.arrivalTime,
              arrivalCountry: destinationCountry,
              airlineName: airlineMap[flight.carrierFsCode],
              departureAirport: flight.departureAirportFsCode,
              arrivalAirport: flight.arrivalAirportFsCode
            });
          }
          return acc;
        }, []);

        onSearchResults(processedFlights);
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