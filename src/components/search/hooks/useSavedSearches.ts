
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/user/UserContext";
import type { SavedSearch, SavedSearchCriteria } from "../types";
import { PetPolicyFilterParams } from "@/types/policy-filters";
import { useSaveSearch } from "./useSaveSearch";

export const useSavedSearches = (userId: string | undefined) => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const { toast } = useToast();
  const { user } = useUser();

  useEffect(() => {
    if (userId) {
      console.log('Loading saved searches for user:', userId);
      loadSavedSearches();
    } else {
      console.log('No user logged in, clearing saved searches');
      setSavedSearches([]);
    }
  }, [userId]);

  const loadSavedSearches = async () => {
    if (!userId) return;
    
    console.log('Fetching saved searches from database...');
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error loading saved searches:", error);
      toast({
        title: "Error loading saved searches",
        description: "Could not load your saved searches. Please try again.",
        variant: "destructive",
      });
      return;
    }

    console.log('Received saved searches data:', data);
    setSavedSearches(data || []);
  };

  const handleDeleteSearch = async (searchId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId);

      if (error) throw error;

      toast({
        title: "Search deleted",
        description: "Your saved search has been removed.",
      });

      // Refresh the saved searches list
      loadSavedSearches();
    } catch (error) {
      console.error("Error deleting saved search:", error);
      toast({
        title: "Error deleting search",
        description: "Could not delete your saved search. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Use the new save search hook
  const { saveSearch, isSaving } = useSaveSearch({
    userId,
    onSaveComplete: loadSavedSearches
  });

  const saveFlight = async (
    searchCriteria: {
      origin: string;
      destination: string;
      date?: Date;
      passengers: number;
      search_type?: 'route' | 'policy';
      policySearch?: string;
    },
    activeFilters?: PetPolicyFilterParams
  ) => {
    if (!userId) return false;

    try {
      const searchData = {
        user_id: userId,
        origin: searchCriteria.origin,
        destination: searchCriteria.destination,
        search_date: searchCriteria.date ? searchCriteria.date.toISOString().split('T')[0] : null,
      };

      // Save to route_searches table for search count tracking
      const { error } = await supabase
        .from('route_searches')
        .insert(searchData);

      if (error) {
        console.error("Error saving search:", error);
        throw error;
      }

      // Also save as a named search if this is a full save operation
      if (searchCriteria.search_type) {
        await saveSearch(
          {
            origin: searchCriteria.origin,
            destination: searchCriteria.destination,
            date: searchCriteria.date,
            policySearch: searchCriteria.policySearch || '',
            passengers: searchCriteria.passengers,
            search_type: searchCriteria.search_type
          },
          activeFilters
        );
      }

      return true;
    } catch (error) {
      console.error("Error in saveFlight:", error);
      return false;
    }
  };

  return {
    savedSearches,
    handleDeleteSearch,
    loadSavedSearches,
    saveFlight,
    saveSearch,
    isSaving
  };
};
