
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

const isUnlimitedPlan = (plan?: string) => {
  return ['premium', 'vip', 'tester', 'enterprise'].includes(plan || '');
};

const checkSearchAllowed = (profile: any) => {
  if (!profile) return false;
  
  // Site manager always allowed
  if (profile.role === 'site_manager') return true;
  
  // Pet lover with premium+ plans
  if (profile.role === 'pet_lover' && isUnlimitedPlan(profile.plan)) {
    return true;
  }
  
  // Pet caddie check search count
  if (profile.role === 'pet_caddie') {
    return (profile.search_count || 0) < 5;
  }
  
  return true; // Default to allowing search for other cases
};

export const useFlightSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const incrementSearchCount = async (userId: string) => {
    const currentCount = profile?.search_count || 0;
    const { error } = await supabase
      .from('profiles')
      .update({ search_count: currentCount + 1 })
      .eq('id', userId);

    if (error) {
      console.error('Error updating search count:', error);
      throw error;
    }
  };

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

    // Check if search is allowed based on role and search count
    if (!checkSearchAllowed(profile)) {
      toast({
        title: "Search limit reached",
        description: profile?.role === 'pet_caddie' 
          ? "You have reached your search limit. Please upgrade your plan to continue searching."
          : "You don't have permission to perform searches.",
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

      // Increment search count if the search was successful
      if (!cachedResult && profile?.role === 'pet_caddie') {
        await incrementSearchCount(user.id);
      }

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
