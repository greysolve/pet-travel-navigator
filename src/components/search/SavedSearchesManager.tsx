import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SaveSearchDialog } from "./saved-searches/SaveSearchDialog";
import { ExportDialog } from "./saved-searches/ExportDialog";
import type { FlightData, PetPolicy, CountryPolicy } from "../flight-results/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const handleSaveSearch = async (name: string) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .insert({
          name,
          search_criteria: currentSearch
        });

      if (error) throw error;

      toast({
        title: "Search saved successfully",
        description: `Your search has been saved as "${name}"`,
      });

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

  return (
    <div className="flex justify-end gap-2">
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