
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
  handleFlightSearch: () => Promise<void>;
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
      return;
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
      } else {
        setSearchCount(profile.search_count - 1);
      }
    } catch (error) {
      console.error("Unexpected error decrementing search count:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  }, [profile, toast, setSearchCount]);

  const handleFlightSearch = async () => {
    if (!profile) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search",
        variant: "destructive",
      });
      return;
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
        return;
      }
    }

    setIsSearchLoading(true);
    try {
      // Simulate flight search API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Decrement search count if user is a pet caddie with a limited search plan
      if (isPetCaddie && !planDetails?.is_search_unlimited) {
        await decrementSearchCount();
      }
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
