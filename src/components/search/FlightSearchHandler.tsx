
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { FlightData, PetPolicy } from "../flight-results/types";
import { useQuery } from "@tanstack/react-query";

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
  const { user } = useAuth();

  // Get user's profile data including search count
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      console.log('Profile data:', data);
      return data;
    },
    enabled: !!user
  });

  // Get user's role
  const { data: userRole } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      console.log('User role:', data);
      return data?.role;
    },
    enabled: !!user
  });

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

    // Add debug logs for search limit check
    console.log('Checking search limits:', {
      userRole,
      searchCount: profile?.search_count,
      isPetCaddie: userRole === 'pet_caddie'
    });

    // Check if user is a pet_caddie and has searches remaining
    if (userRole === 'pet_caddie' && profile?.search_count === 0) {
      console.log('Search limit reached:', {
        userRole,
        searchCount: profile?.search_count
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
      
      const { data, error } = await supabase.functions.invoke('search_flight_schedules', {
        body: { origin, destination, date: date.toISOString() }
      });

      if (error) throw error;

      // Record the search in route_searches
      const { error: searchError } = await supabase
        .from('route_searches')
        .insert({
          user_id: user.id,
          origin,
          destination,
          search_date: date.toISOString().split('T')[0]
        });

      if (searchError) {
        console.error('Error recording search:', searchError);
      }
      
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
      
      toast({
        title: "Error searching flights",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      onSearchComplete();
    }
  };

  return { 
    handleFlightSearch, 
    isLoading,
    searchCount: profile?.search_count,
    isPetCaddie: userRole === 'pet_caddie'
  };
};
