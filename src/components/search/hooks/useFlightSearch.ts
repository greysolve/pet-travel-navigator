
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { usePlanDetails } from "./usePlanDetails";
import { useSearchCount } from "./useSearchCount";
import type { FlightData } from "../../flight-results/types";

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
  const isPetCaddie = profile?.userRole === 'pet_caddie';
  const { planDetails } = usePlanDetails(profile?.plan);
  const { searchCount, decrementSearchCount } = useSearchCount(profile);

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
