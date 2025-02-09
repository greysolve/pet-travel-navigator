
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { FlightData, PetPolicy } from "../flight-results/types";

interface FlightSearchProps {
  origin: string;
  destination: string;
  date: Date;
  onSearchResults: (flights: FlightData[], petPolicies?: Record<string, PetPolicy>) => void;
  onSearchComplete: () => void;
}

export const useFlightSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const handleFlightSearch = async ({
    origin,
    destination,
    date,
    onSearchResults,
    onSearchComplete,
  }: FlightSearchProps) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search for flights.",
        variant: "destructive",
      });
      onSearchComplete();
      return;
    }

    console.log('Checking search limits:', {
      userRole: profile?.userRole,
      searchCount: profile?.search_count,
      isPetCaddie: profile?.userRole === 'pet_caddie'
    });

    if (profile?.userRole === 'pet_caddie' && profile?.search_count === 0) {
      console.log('Search limit reached:', {
        userRole: profile.userRole,
        searchCount: profile.search_count
      });
      toast({
        title: "Search limit reached",
        description: "You have reached your search limit. Please upgrade your plan to continue searching.",
        variant: "destructive",
      });
      onSearchComplete();
      return;
    }

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
      
      // First, try to record the search
      const { error: searchError } = await supabase
        .from('route_searches')
        .insert({
          user_id: user.id,
          origin,
          destination,
          search_date: date.toISOString().split('T')[0]
        });

      if (searchError) {
        // Check if this is a duplicate search error
        if (searchError.code === '23505') {
          toast({
            title: "Duplicate search",
            description: "You have already searched this route and date combination. Please try a different route or date.",
            variant: "destructive",
          });
          onSearchComplete();
          return;
        }
        throw searchError;
      }

      // If search was recorded successfully, proceed with the flight search
      const { data, error } = await supabase.functions.invoke('search_flight_schedules', {
        body: { origin, destination, date: date.toISOString() }
      });

      if (error) throw error;
      
      if (data?.connections) {
        console.log('Found connections:', data.connections);
        onSearchResults(data.connections);
      } else {
        console.log('No flights found in response');
        onSearchResults([]);
      }
    } catch (error: any) {
      console.error('Error searching flights:', error);
      let errorMessage = "There was an error searching for flights.";
      
      if (error.message?.includes('policy')) {
        errorMessage = "You have reached your search limit. Please upgrade your plan to continue searching.";
      }
      
      // Only show error toast if it wasn't already shown for duplicate search
      if (error.code !== '23505') {
        toast({
          title: "Error searching flights",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      onSearchComplete();
    }
  };

  return { 
    handleFlightSearch, 
    isLoading,
    searchCount: profile?.search_count,
    isPetCaddie: profile?.userRole === 'pet_caddie'
  };
};
