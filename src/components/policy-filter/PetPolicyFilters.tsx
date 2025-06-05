
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { PetTypeFilter } from "./PetTypeFilter";
import { TravelMethodFilter } from "./TravelMethodFilter";
import { WeightFilter } from "./WeightFilter";
import { BreedRestrictionsFilter } from "./BreedRestrictionsFilter";
import { 
  PetPolicyFilterParams,
  PetTypeFilter as PetTypeFilterValue,
  TravelMethodFilter as TravelMethodFilterValue,
  WeightFilterOptions
} from "@/types/policy-filters";

interface PetPolicyFiltersProps {
  onApplyFilters: (filters: PetPolicyFilterParams) => void;
}

export const PetPolicyFilters = ({ onApplyFilters }: PetPolicyFiltersProps) => {
  const [petTypes, setPetTypes] = useState<PetTypeFilterValue[]>([]);
  const [travelMethod, setTravelMethod] = useState<TravelMethodFilterValue>({
    cabin: true,
    cargo: true
  });
  const [weightOptions, setWeightOptions] = useState<WeightFilterOptions>({});
  const [includeBreedRestrictions, setIncludeBreedRestrictions] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleApplyFilters = () => {
    onApplyFilters({
      petTypes: petTypes.length > 0 ? petTypes : undefined,
      travelMethod: travelMethod,
      // No longer sending minWeight
      maxWeight: weightOptions.max,
      weightIncludesCarrier: weightOptions.includeCarrier,
      includeBreedRestrictions
    });
  };

  const handleResetFilters = () => {
    setPetTypes([]);
    setTravelMethod({ cabin: true, cargo: true });
    setWeightOptions({});
    setIncludeBreedRestrictions(true);
    onApplyFilters({});
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const hasActiveFilters = 
    petTypes.length > 0 || 
    !travelMethod.cabin || 
    !travelMethod.cargo || 
    weightOptions.min !== undefined || 
    weightOptions.max !== undefined || 
    !includeBreedRestrictions;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <button 
        onClick={toggleExpand}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filter Pet Policies</span>
          {hasActiveFilters && (
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </div>
        <span className="text-sm text-gray-500">
          {isExpanded ? "Hide" : "Show"} Filters
        </span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PetTypeFilter 
              selectedTypes={petTypes} 
              onChange={setPetTypes} 
            />
            <TravelMethodFilter 
              selectedMethod={travelMethod} 
              onChange={setTravelMethod} 
            />
            <WeightFilter 
              options={weightOptions} 
              onChange={setWeightOptions} 
            />
            <BreedRestrictionsFilter 
              includeBreedRestrictions={includeBreedRestrictions} 
              onChange={setIncludeBreedRestrictions} 
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              size="sm"
            >
              <X className="h-4 w-4 mr-1" /> Reset
            </Button>
            <Button 
              onClick={handleApplyFilters}
              size="sm"
            >
              <Filter className="h-4 w-4 mr-1" /> Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
