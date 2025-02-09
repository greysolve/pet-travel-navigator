
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
  const { user, profile, profileLoading, refreshProfile } = useAuth();

  const checkSearchEligibility = () => {
    if (!profile) return { eligible: false, message: "Profile not loaded" };
    
    const isPetCaddie = profile.role === 'pet_caddie';
    const searchCount = profile.search_count ?? 0;
    
    console.log('Checking search eligibility:', {
      role: profile.role,
      searchCount,
      isPetCaddie
    });

    if (isPetCaddie && searchCount <= 0) {
      return {
        eligible: false,
        message: "You have no remaining searches. Please upgrade your plan to continue searching."
      };
    }

    return { eligible: true };
  };

  const checkExistingSearch = async (userId: string, origin: string, destination: string, date: string) => {
    try {
      const { data: existingSearches, error } = await supabase
        .from('route_searches')
        .select('id')
        .eq('user_id', userId)
        .eq('origin', origin)
        .eq('destination', destination)
        .eq('search_date', date)
        .limit(1);

      if (error) {
        console.error('Error checking for existing search:', error);
        return false;
      }

      return existingSearches && existingSearches.length > 0;
    } catch (error) {
      console.error('Error in checkExistingSearch:', error);
      return false;
    }
  };

  const recordSearch = async (userId: string, origin: string, destination: string, date: string) => {
    try {
      // Check for existing search
      const isDuplicate = await checkExistingSearch(userId, origin, destination, date);
      
      // Show duplicate search info only for pet_caddie users on free plan
      if (isDuplicate) {
        console.log('Duplicate search detected');
        
        const isPetCaddieOnFreePlan = profile?.role === 'pet_caddie' && profile?.plan === 'free';
        
        if (isPetCaddieOnFreePlan) {
          toast({
            title: "Duplicate Search",
            description: "You have already searched this route and date combination. Note that this search will still count against your search limit.",
          });
        }
      }

      // Always record the search
      const { error: searchError } = await supabase
        .from('route_searches')
        .insert({
          user_id: userId,
          origin,
          destination,
          search_date: date
        });

      if (searchError) {
        console.error('Error recording search:', searchError);
        throw searchError;
      }
      
      // After successfully recording the search, refresh the profile to get updated search count
      await refreshProfile();
      
      return true;
    } catch (error) {
      console.error('Error in recordSearch:', error);
      throw error;
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

    if (profileLoading) {
      toast({
        title: "Loading",
        description: "Please wait while we load your profile.",
      });
      onSearchComplete();
      return;
    }

    // Check search eligibility before proceeding
    const { eligible, message } = checkSearchEligibility();
    if (!eligible) {
      console.log('Search blocked - not eligible:', message);
      toast({
        title: "Search limit reached",
        description: message,
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
      console.log('Starting search transaction with:', { origin, destination, date: date.toISOString() });
      
      // Record the search first - this will trigger the search_count update
      await recordSearch(
        user.id,
        origin,
        destination,
        date.toISOString().split('T')[0]
      );

      // Proceed with the flight search
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
    isPetCaddie: profile?.role === 'pet_caddie',
    isProfileLoading: profileLoading
  };
};
