
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import type { FlightData } from "../flight-results/types";
import { useSearchParams } from "react-router-dom";
import type { SystemPlan } from "@/types/auth";

interface UseFlightSearchReturn {
  isSearchLoading: boolean;
  searchCount: number | undefined;
  isPetCaddie: boolean;
  handleFlightSearch: (
    origin: string, 
    destination: string, 
    date: Date, 
    onResults: (results: FlightData[], policies?: Record<string, any>) => void,
    onComplete?: () => void
  ) => Promise<FlightData[]>;
}

export const useFlightSearch = (): UseFlightSearchReturn => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchCount, setSearchCount] = useState<number | undefined>(profile?.search_count);
  const [planDetails, setPlanDetails] = useState<SystemPlan | null>(null);

  const isPetCaddie = profile?.userRole === 'pet_caddie';

  useEffect(() => {
    setSearchCount(profile?.search_count);
  }, [profile?.search_count]);

  // Fetch plan details when profile changes
  useEffect(() => {
    const fetchPlanDetails = async () => {
      if (!profile?.plan) return;

      try {
        const { data, error } = await supabase
          .from('system_plans')
          .select('*')
          .eq('name', profile.plan)
          .single();

        if (error) {
          console.error("Error fetching plan details:", error);
          return;
        }

        setPlanDetails(data as SystemPlan);
      } catch (error) {
        console.error("Unexpected error fetching plan details:", error);
      }
    };

    if (profile?.plan) {
      fetchPlanDetails();
    }
  }, [profile?.plan]);

  const decrementSearchCount = useCallback(async () => {
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "Could not decrement search count: user not found",
        variant: "destructive",
      });
      return;
    }

    if (profile.search_count === undefined || profile.search_count <= 0) {
      toast({
        title: "No searches remaining",
        description: "You have reached your search limit. Please upgrade your plan.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ search_count: profile.search_count - 1 })
        .eq('id', profile.id);

      if (error) {
        console.error("Error decrementing search count:", error);
        toast({
          title: "Error",
          description: "Failed to update search count. Please try again.",
          variant: "destructive",
        });
        return false;
      } else {
        setSearchCount(profile.search_count - 1);
        return true;
      }
    } catch (error) {
      console.error("Unexpected error decrementing search count:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [profile, toast, setSearchCount]);

  const handleFlightSearch = async (
    origin: string, 
    destination: string, 
    date: Date,
    onResults: (results: FlightData[], policies?: Record<string, any>) => void,
    onComplete?: () => void
  ) => {
    if (!profile) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search",
        variant: "destructive",
      });
      return [];
    }

    // Check if the user can make a search based on role and plan
    if (isPetCaddie) {
      const isUnlimited = planDetails?.is_search_unlimited;
      
      if (!isUnlimited && (profile.search_count === undefined || profile.search_count <= 0)) {
        toast({
          title: "No searches remaining",
          description: "You have reached your search limit. Please upgrade your plan.",
          variant: "destructive",
        });
        return [];
      }
    }

    setIsSearchLoading(true);
    try {
      console.log('Calling search_flight_schedules with:', { origin, destination, date });
      
      // Record search in the database
      if (isPetCaddie && !planDetails?.is_search_unlimited) {
        const decremented = await decrementSearchCount();
        if (!decremented) {
          setIsSearchLoading(false);
          return [];
        }
      }
      
      // Call the Supabase Edge Function to search for flights
      const { data, error } = await supabase.functions.invoke('search_flight_schedules', {
        body: {
          origin,
          destination,
          date: date.toISOString(),
        },
      });

      if (error) {
        console.error('Error calling search_flight_schedules:', error);
        toast({
          title: "Search failed",
          description: "There was an error fetching flight data. Please try again.",
          variant: "destructive",
        });
        return [];
      }

      console.log('Received flight search results:', data);
      
      // Check that we have a valid connections array
      if (!data || !data.connections || !Array.isArray(data.connections)) {
        console.error('Invalid or empty connections array in response:', data);
        toast({
          title: "No flights found",
          description: "We couldn't find any flights matching your search criteria.",
          variant: "destructive",
        });
        return [];
      }
      
      // Ensure each flight has the required properties
      const flights = data.connections.map((flight: any) => {
        // Make sure each flight has segments array
        if (!flight.segments && flight.scheduledFlight) {
          flight.segments = flight.scheduledFlight;
        }
        return flight;
      });
      
      console.log('Processed flights to return:', flights);
      
      // Call the callback with the results
      if (onResults) {
        onResults(flights, {});
      }
      
      if (onComplete) {
        onComplete();
      }
      
      return flights;
    } catch (error) {
      console.error('Error in flight search:', error);
      toast({
        title: "Search failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsSearchLoading(false);
    }
  };

  return {
    isSearchLoading,
    searchCount,
    isPetCaddie,
    handleFlightSearch,
  };
};
