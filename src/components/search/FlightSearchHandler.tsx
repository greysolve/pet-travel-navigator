
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
      return data?.role;
    },
    enabled: !!user
  });

  const checkCache = async (origin: string, destination: string, date: Date) => {
    if (!user) {
      console.log('No authenticated user for cache check');
      return null;
    }

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

    console.log('Cache check result:', cachedSearch);
    return cachedSearch;
  };

  const updateCache = async (origin: string, destination: string, date: Date) => {
    if (!user) {
      console.log('No authenticated user for cache update');
      return;
    }

    const searchDate = date.toISOString().split('T')[0];
    const cacheExpiration = new Date();
    cacheExpiration.setMinutes(cacheExpiration.getMinutes() + 5);

    console.log('Updating cache with:', { 
      origin, 
      destination, 
      searchDate,
      cacheExpiration: cacheExpiration.toISOString()
    });

    try {
      const { error } = await supabase
        .from('route_searches')
        .upsert(
          {
            origin,
            destination,
            search_date: searchDate,
            last_searched_at: new Date().toISOString(),
            cached_until: cacheExpiration.toISOString(),
            user_id: user.id
          },
          {
            onConflict: 'origin,destination,search_date'
          }
        );

      if (error) {
        console.error('Error updating cache:', error);
        throw error;
      }

      console.log('Cache updated successfully');
    } catch (error) {
      console.error('Failed to update cache:', error);
    }
  };

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

    // Check if user is a pet_caddie and has searches remaining
    if (userRole === 'pet_caddie' && profile?.search_count === 0) {
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
      // Check cache first
      const cachedResult = await checkCache(origin, destination, date);
      
      if (cachedResult) {
        console.log('Cache hit! Using cached data');
      }

      console.log('Sending search request with:', { origin, destination, date: date.toISOString() });
      
      const { data, error } = await supabase.functions.invoke('search_flight_schedules', {
        body: { origin, destination, date: date.toISOString() }
      });

      if (error) throw error;

      // Update cache after successful search if not a cache hit
      if (!cachedResult) {
        await updateCache(origin, destination, date);
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
