import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import type { FlightData } from "../flight-results/types";
import { useSearchParams } from "react-router-dom";
import { useSystemConfig } from "@/contexts/SystemConfigContext";

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
  const { plans } = useSystemConfig();
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchCount, setSearchCount] = useState<number | undefined>(profile?.search_count);
  const [planDetails, setPlanDetails] = useState<any | null>(null);

  const isPetCaddie = profile?.userRole === 'pet_caddie';

  useEffect(() => {
    setSearchCount(profile?.search_count);
  }, [profile?.search_count]);

  useEffect(() => {
    const fetchPlanDetails = async () => {
      if (!profile?.plan) return;

      try {
        const planFromContext = plans.find(p => p.name === profile.plan);
        
        if (planFromContext) {
          setPlanDetails(planFromContext);
          return;
        }

        const { data, error } = await supabase
          .from('system_plans')
          .select('*')
          .eq('name', profile.plan)
          .single();

        if (error) {
          console.error("Error fetching plan details:", error);
          return;
        }

        setPlanDetails(data);
      } catch (error) {
        console.error("Unexpected error fetching plan details:", error);
      }
    };

    if (profile?.plan) {
      fetchPlanDetails();
    }
  }, [profile?.plan, plans]);

  const decrementSearchCount = useCallback(async () => {
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "Could not decrement search count: user not found",
        variant: "destructive",
      });
      return false;
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
      
      if (isPetCaddie && !planDetails?.is_search_unlimited) {
        const decremented = await decrementSearchCount();
        if (!decremented) {
          setIsSearchLoading(false);
          return [];
        }
      }
      
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
      
      const flights = data?.connections || [];
      
      if (onResults) {
        onResults(flights, {});
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
      if (onComplete) {
        onComplete();
      }
    }
  };

  return {
    isSearchLoading,
    searchCount,
    isPetCaddie,
    handleFlightSearch,
  };
};
