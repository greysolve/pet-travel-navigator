import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SaveSearchDialog } from "./saved-searches/SaveSearchDialog";
import { ExportDialog } from "./saved-searches/ExportDialog";
import type { FlightData, PetPolicy, CountryPolicy } from "../flight-results/types";

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
        onClose={() => setIsSaveDialogOpen(false)}
        searchCriteria={currentSearch}
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