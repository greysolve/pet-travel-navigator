
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth/AuthContext";
import type { SavedSearch } from "../types";

export const useSavedSearches = (userId: string | undefined) => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

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
    setSavedSearches(data.map(item => ({
      id: item.id,
      name: item.name,
      created_at: item.created_at,
      search_criteria: item.search_criteria as SavedSearch['search_criteria']
    })));
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

  const saveFlight = async (origin: string, destination: string, date?: Date, passengers: number = 1) => {
    if (!userId) return;

    try {
      const searchData = {
        user_id: userId,
        origin,
        destination,
        search_date: date ? date.toISOString().split('T')[0] : null,
        // Optional: Add an entry for passengers
      };

      // Save to route_searches table for search count tracking
      const { error } = await supabase
        .from('route_searches')
        .insert(searchData);

      if (error) {
        console.error("Error saving search:", error);
        throw error;
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
    saveFlight
  };
};
