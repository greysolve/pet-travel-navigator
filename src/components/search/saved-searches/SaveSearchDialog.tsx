
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Calendar, Filter, Route } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PetPolicyFilterParams } from "@/types/policy-filters";
import { format } from "date-fns";

interface SaveSearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
  currentSearch: {
    origin: string;
    destination: string;
    date?: Date;
    policySearch: string;
    passengers?: number;
  };
  activeFilters?: PetPolicyFilterParams;
}

export const SaveSearchDialog = ({ 
  isOpen, 
  onOpenChange, 
  onSave,
  currentSearch,
  activeFilters
}: SaveSearchDialogProps) => {
  const [searchName, setSearchName] = useState("");

  // Generate default name when dialog opens
  useEffect(() => {
    if (isOpen) {
      const searchType = currentSearch.policySearch ? 'Policy' : 'Route';
      const defaultName = `${searchType}: ${currentSearch.origin} → ${currentSearch.destination}`;
      setSearchName(defaultName);
    }
  }, [isOpen, currentSearch]);

  const handleSave = () => {
    onSave(searchName);
    setSearchName("");
  };

  const getFilterSummary = () => {
    if (!activeFilters || Object.keys(activeFilters).length === 0) return null;
    
    const parts = [];
    
    if (activeFilters.petTypes && activeFilters.petTypes.length > 0) {
      parts.push(`Pet types: ${activeFilters.petTypes.join(', ')}`);
    }
    
    if (activeFilters.maxWeight) {
      parts.push(`Max weight: ${activeFilters.maxWeight}kg`);
    }
    
    if (activeFilters.travelMethod) {
      const methods = [];
      if (activeFilters.travelMethod.cabin) methods.push('cabin');
      if (activeFilters.travelMethod.cargo) methods.push('cargo');
      if (methods.length > 0) parts.push(`Travel: ${methods.join('/')}`);
    }
    
    if (activeFilters.includeBreedRestrictions === false) {
      parts.push('No breed restrictions');
    }
    
    return parts;
  };

  const filterSummary = getFilterSummary();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save Current Search</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          {/* Search Preview */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Route className="h-4 w-4 text-blue-600" />
              <span className="font-medium">
                {currentSearch.origin} → {currentSearch.destination}
              </span>
            </div>
            
            {currentSearch.date && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{format(currentSearch.date, 'PPP')}</span>
              </div>
            )}
            
            {currentSearch.policySearch && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Policy search:</span> {currentSearch.policySearch}
              </div>
            )}
            
            {filterSummary && filterSummary.length > 0 && (
              <div className="border-t pt-2 mt-2">
                <div className="flex items-center gap-2 text-sm text-blue-600 mb-1">
                  <Filter className="h-4 w-4" />
                  <span className="font-medium">Active Filters:</span>
                </div>
                <ul className="text-xs text-gray-600 space-y-1">
                  {filterSummary.map((filter, index) => (
                    <li key={index}>• {filter}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Name Input */}
          <div>
            <label htmlFor="search-name" className="block text-sm font-medium mb-2">
              Search Name
            </label>
            <Input
              id="search-name"
              placeholder="Enter a name for this search"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
          
          <Button 
            onClick={handleSave} 
            className="w-full"
            disabled={!searchName.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Search
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
