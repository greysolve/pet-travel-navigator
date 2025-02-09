import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SaveSearchDialog } from "./saved-searches/SaveSearchDialog";
import { ExportDialog } from "./saved-searches/ExportDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FlightData, PetPolicy, CountryPolicy } from "../flight-results/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SavedSearch {
  id: string;
  name: string | null;
  search_criteria: {
    origin: string;
    destination: string;
    date?: string;
    policySearch: string;
  };
  created_at: string;
}

interface SavedSearchesManagerProps {
  currentSearch: {
    origin: string;
    destination: string;
    date?: Date;
    policySearch: string;
  };
  flights: FlightData[];
  petPolicies?: Record<string, PetPolicy>;
  countryPolicies?: CountryPolicy[];
  onLoadSearch: (searchCriteria: any) => void;
}

export const SavedSearchesManager = ({
  currentSearch,
  flights,
  petPolicies,
  countryPolicies,
  onLoadSearch,
}: SavedSearchesManagerProps) => {
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchSavedSearches();
  }, []);

  const fetchSavedSearches = async () => {
    try {
      console.log("Fetching saved searches...");
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved searches:', error);
        throw error;
      }

      console.log("Fetched saved searches:", data);
      setSavedSearches(data.map(search => ({
        ...search,
        search_criteria: search.search_criteria as SavedSearch['search_criteria']
      })));
    } catch (error) {
      console.error('Error in fetchSavedSearches:', error);
      toast({
        title: "Error loading saved searches",
        description: "There was a problem loading your saved searches.",
        variant: "destructive",
      });
    }
  };

  const handleSaveSearch = async (name: string) => {
    try {
      const searchToSave = {
        ...currentSearch,
        date: currentSearch.date?.toISOString()
      };

      const { error } = await supabase
        .from('saved_searches')
        .insert({
          name,
          search_criteria: searchToSave
        });

      if (error) throw error;

      toast({
        title: "Search saved successfully",
        description: `Your search has been saved as "${name}"`,
      });

      fetchSavedSearches(); // Refresh the list
      setIsSaveDialogOpen(false);
    } catch (error) {
      console.error('Error saving search:', error);
      toast({
        title: "Error saving search",
        description: "There was a problem saving your search. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLoadSearch = (searchCriteria: SavedSearch['search_criteria']) => {
    onLoadSearch(searchCriteria);
    toast({
      title: "Search loaded",
      description: "The saved search has been loaded successfully.",
    });
  };

  return (
    <div className="flex justify-between gap-2">
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">My Searches</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[240px] bg-white">
            {savedSearches.length === 0 ? (
              <DropdownMenuItem disabled>No saved searches</DropdownMenuItem>
            ) : (
              savedSearches.map((search) => (
                <DropdownMenuItem
                  key={search.id}
                  onClick={() => handleLoadSearch(search.search_criteria)}
                  className="flex flex-col items-start py-2 cursor-pointer"
                >
                  <span className="font-medium">{search.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(search.created_at), 'MMM d, yyyy')}
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={() => setIsSaveDialogOpen(true)}
        >
          Save Search
        </Button>
        
        <Button 
          variant="outline"
          onClick={() => setIsExportDialogOpen(true)}
        >
          Export Results
        </Button>
      </div>

      <SaveSearchDialog
        isOpen={isSaveDialogOpen}
        onOpenChange={setIsSaveDialogOpen}
        onSave={handleSaveSearch}
      />

      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        flights={flights}
        petPolicies={petPolicies}
        countryPolicies={countryPolicies}
      />
    </div>
  );
};