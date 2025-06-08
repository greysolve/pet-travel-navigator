
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
import { X, Calendar, Filter } from "lucide-react";
import type { FlightData, PetPolicy, CountryPolicy } from "../flight-results/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import type { SavedSearch, SavedSearchCriteria } from "./types";
import { PetPolicyFilterParams } from "@/types/policy-filters";

interface SavedSearchesManagerProps {
  currentSearch: {
    origin: string;
    destination: string;
    date?: Date;
    policySearch: string;
    passengers?: number;
  };
  flights: FlightData[];
  petPolicies?: Record<string, PetPolicy>;
  countryPolicies?: CountryPolicy[];
  activeFilters?: PetPolicyFilterParams;
  onLoadSearch: (searchCriteria: SavedSearchCriteria) => void;
}

export const SavedSearchesManager = ({
  currentSearch,
  flights,
  petPolicies,
  countryPolicies,
  activeFilters,
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
      // Cast the Json type to our SavedSearchCriteria type with proper type safety
      const typedSearches = data?.map(search => ({
        ...search,
        search_criteria: search.search_criteria as unknown as SavedSearchCriteria
      })) || [];
      
      setSavedSearches(typedSearches);
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
      const searchToSave: SavedSearchCriteria = {
        ...currentSearch,
        date: currentSearch.date?.toISOString().split('T')[0],
        search_type: currentSearch.policySearch ? 'policy' : 'route',
        activeFilters: activeFilters && Object.keys(activeFilters).length > 0 ? activeFilters : undefined
      };

      const { error } = await supabase
        .from('saved_searches')
        .insert({
          name,
          search_criteria: searchToSave as any // Cast to any for Json compatibility
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

  const handleLoadSearch = (searchCriteria: SavedSearchCriteria) => {
    // Smart date handling - update past dates to today
    let updatedCriteria = { ...searchCriteria };
    let dateUpdated = false;
    
    if (searchCriteria.date) {
      const savedDate = parseISO(searchCriteria.date);
      const today = startOfDay(new Date());
      
      if (isBefore(savedDate, today)) {
        updatedCriteria.date = format(today, 'yyyy-MM-dd');
        dateUpdated = true;
      }
    }

    onLoadSearch(updatedCriteria);
    
    // Show notification if date was updated
    if (dateUpdated) {
      toast({
        title: "Date updated",
        description: "The departure date has been updated to today since the saved date was in the past.",
      });
    } else {
      toast({
        title: "Search loaded",
        description: "The saved search has been loaded successfully.",
      });
    }
  };

  const handleDeleteSearch = async (e: React.MouseEvent, searchId: string, searchName: string) => {
    e.stopPropagation(); // Prevent triggering the load search action
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId);

      if (error) throw error;

      toast({
        title: "Search deleted",
        description: `"${searchName}" has been deleted.`,
      });

      fetchSavedSearches(); // Refresh the list
    } catch (error) {
      console.error('Error deleting search:', error);
      toast({
        title: "Error deleting search",
        description: "There was a problem deleting your search. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getFilterSummary = (filters?: any) => {
    if (!filters || Object.keys(filters).length === 0) return null;
    
    const parts = [];
    
    if (filters.petTypes && filters.petTypes.length > 0) {
      parts.push(`${filters.petTypes.join(', ')}`);
    }
    
    if (filters.maxWeight) {
      parts.push(`≤${filters.maxWeight}kg`);
    }
    
    if (filters.travelMethod) {
      const methods = [];
      if (filters.travelMethod.cabin) methods.push('cabin');
      if (filters.travelMethod.cargo) methods.push('cargo');
      if (methods.length > 0) parts.push(methods.join('/'));
    }
    
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  const isDateInPast = (dateStr?: string) => {
    if (!dateStr) return false;
    const savedDate = parseISO(dateStr);
    const today = startOfDay(new Date());
    return isBefore(savedDate, today);
  };

  return (
    <div className="flex justify-between gap-2">
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">My Searches</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[280px] bg-white">
            {savedSearches.length === 0 ? (
              <DropdownMenuItem disabled>No saved searches</DropdownMenuItem>
            ) : (
              savedSearches.map((search) => {
                const filterSummary = getFilterSummary(search.search_criteria.activeFilters);
                const dateInPast = isDateInPast(search.search_criteria.date);
                
                return (
                  <DropdownMenuItem
                    key={search.id}
                    onClick={() => handleLoadSearch(search.search_criteria)}
                    className="flex flex-col items-start py-3 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col flex-1">
                        <span className="font-medium">
                          {search.name || `${search.search_criteria.origin} → ${search.search_criteria.destination}`}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(new Date(search.created_at), 'MMM d, yyyy')}</span>
                          {search.search_criteria.date && (
                            <span className={`flex items-center gap-1 ${dateInPast ? 'text-orange-600' : ''}`}>
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(search.search_criteria.date), 'MMM d')}
                              {dateInPast && ' (will update)'}
                            </span>
                          )}
                        </div>
                        {filterSummary && (
                          <span className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                            <Filter className="h-3 w-3" />
                            {filterSummary}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDeleteSearch(e, search.id, search.name || 'Unnamed search')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </DropdownMenuItem>
                );
              })
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
        currentSearch={currentSearch}
        activeFilters={activeFilters}
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
