import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { FlightData } from "../flight-results/types";

interface FlightSearchProps {
  origin: string;
  destination: string;
  date: Date;
  destinationCountry: string | undefined;
  onSearchResults: (flights: FlightData[]) => void;
  onSearchComplete: () => void;
}

export const useFlightSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const checkCache = async (origin: string, destination: string, date: Date) => {
    const searchDate = date.toISOString().split('T')[0];
    console.log('Checking cache for:', { origin, destination, searchDate });

    const { data: cachedSearch, error } = await supabase
      .from('route_searches')
      .select('*')
      .eq('origin', origin)
      .eq('destination', destination)
      .eq('search_date', searchDate)
      .gt('cached_until', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error('Error checking cache:', error);
      return null;
    }

    return cachedSearch;
  };

  const updateCache = async (origin: string, destination: string, date: Date) => {
    const searchDate = date.toISOString().split('T')[0];
    const cacheExpiration = new Date();
    cacheExpiration.setMinutes(cacheExpiration.getMinutes() + 5); // 5-minute cache

    console.log('Updating cache for:', { origin, destination, searchDate });

    const { error } = await supabase
      .from('route_searches')
      .upsert({
        origin,
        destination,
        search_date: searchDate,
        last_searched_at: new Date().toISOString(),
        cached_until: cacheExpiration.toISOString()
      }, {
        onConflict: 'origin,destination,search_date'
      });

    if (error) {
      console.error('Error updating cache:', error);
    }
  };

  const handleFlightSearch = async ({
    origin,
    destination,
    date,
    destinationCountry,
    onSearchResults,
    onSearchComplete,
  }: FlightSearchProps) => {
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
      // Check cache first
      const cachedResult = await checkCache(origin, destination, date);
      
      if (cachedResult) {
        console.log('Cache hit! Using cached data');
        // For now, we still make the API call since we're not storing the flight data
        // In a full implementation, we'd store and retrieve the flight data as well
      }

      console.log('Sending search request with:', { origin, destination, date: date.toISOString() });
      
      const { data, error } = await supabase.functions.invoke('search_flight_schedules', {
        body: { origin, destination, date: date.toISOString() }
      });

      if (error) throw error;

      console.log('Full API response:', data);
      
      // Update cache after successful search
      await updateCache(origin, destination, date);
      
      if (data?.connections) {
        console.log('Found connections:', data.connections);
        onSearchResults(data.connections);
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