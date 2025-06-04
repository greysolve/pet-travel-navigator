
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SavedSearchCriteria } from "../types";
import { PetPolicyFilterParams } from "@/types/policy-filters";

interface UseSaveSearchProps {
  userId?: string;
  onSaveComplete?: () => void;
}

export const useSaveSearch = ({ userId, onSaveComplete }: UseSaveSearchProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const checkExistingSearch = async (origin: string, destination: string) => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('saved_searches')
      .select('id, name, search_criteria')
      .eq('user_id', userId)
      .filter('search_criteria->origin', 'eq', origin)
      .filter('search_criteria->destination', 'eq', destination);

    if (error) {
      console.error('Error checking existing search:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  };

  const saveSearch = async (
    searchCriteria: {
      origin: string;
      destination: string;
      date?: Date;
      policySearch: string;
      passengers?: number;
      search_type?: 'route' | 'policy';
    },
    activeFilters?: PetPolicyFilterParams,
    customName?: string
  ) => {
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save searches.",
        variant: "destructive",
      });
      return false;
    }

    setIsSaving(true);

    try {
      // Check for existing search
      const existingSearch = await checkExistingSearch(searchCriteria.origin, searchCriteria.destination);
      
      // Prepare search criteria with advanced filters
      const criteriaToSave: SavedSearchCriteria = {
        ...searchCriteria,
        date: searchCriteria.date?.toISOString().split('T')[0],
        activeFilters: activeFilters && Object.keys(activeFilters).length > 0 ? activeFilters : undefined
      };

      let searchName = customName;
      
      // Generate default name if not provided
      if (!searchName) {
        const searchType = searchCriteria.policySearch ? 'Policy' : 'Route';
        searchName = `${searchType}: ${searchCriteria.origin} → ${searchCriteria.destination}`;
      }

      if (existingSearch) {
        // Update existing search
        const { error } = await supabase
          .from('saved_searches')
          .update({
            name: searchName,
            search_criteria: criteriaToSave as any, // Cast to any for Json compatibility
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSearch.id);

        if (error) throw error;

        toast({
          title: "Search updated",
          description: `"${searchName}" has been updated with new parameters.`,
        });
      } else {
        // Create new search
        const { error } = await supabase
          .from('saved_searches')
          .insert({
            user_id: userId,
            name: searchName,
            search_criteria: criteriaToSave as any // Cast to any for Json compatibility
          });

        if (error) throw error;

        toast({
          title: "Search saved",
          description: `"${searchName}" has been saved successfully.`,
        });
      }

      onSaveComplete?.();
      return true;
    } catch (error) {
      console.error('Error saving search:', error);
      toast({
        title: "Error saving search",
        description: "Could not save your search. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveSearch,
    checkExistingSearch,
    isSaving
  };
};
