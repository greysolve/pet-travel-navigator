
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
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
  const { user } = useAuth();
  const { profile } = useProfile();

  const checkSearchEligibility = () => {
    if (!profile) return { eligible: false, message: "Profile not loaded" };
    
    const isPetCaddie = profile.userRole === 'pet_caddie';
    
    console.log('Checking search eligibility:', {
      userRole: profile.userRole,
      searchCount: profile.search_count,
      isPetCaddie
    });

    if (isPetCaddie && profile.search_count <= 0) {
      return {
        eligible: false,
        message: "You have no remaining searches. Please upgrade your plan to continue searching."
      };
    }

    return { eligible: true };
  };

  const recordSearch = async (userId: string, origin: string, destination: string, date: string) => {
    if (!profile) {
      throw new Error("Profile not loaded");
    }

    try {
      const { error: searchError } = await supabase
        .from('route_searches')
        .insert({
          user_id: userId,
          origin,
          destination,
          search_date: date
        });

      if (searchError?.code === '23505') {
        console.log('Duplicate search detected');
        
        if (profile.userRole === 'pet_caddie') {
          toast({
            title: "Duplicate Search",
            description: "You have already searched this route and date combination. Note that this search will still count against your search limit.",
            variant: "default"
          });
        }
        return true;
      } else if (searchError) {
        console.error('Error recording search:', searchError);
        throw searchError;
      }

      return true;
    } catch (error: any) {
      if (error?.code !== '23505') {
        throw error;
      }
      return true;
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

    if (!profile) {
      toast({
        title: "Profile Error",
        description: "Unable to load your profile. Please try signing out and back in.",
        variant: "destructive",
      });
      onSearchComplete();
      return;
    }

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
      
      await recordSearch(
        user.id,
        origin,
        destination,
        date.toISOString().split('T')[0]
      );

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
    isPetCaddie: profile?.userRole === 'pet_caddie'
  };
};
