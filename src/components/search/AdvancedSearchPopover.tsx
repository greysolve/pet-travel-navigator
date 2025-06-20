
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PetPolicyFilterParams } from "@/types/policy-filters";
import { PetSizeTypeFilter } from "./filters/PetSizeTypeFilter";
import { TravelMethodFilter } from "./filters/TravelMethodFilter";
import { BreedRestrictionsFilter } from "./filters/BreedRestrictionsFilter";
import { FilterActions } from "./filters/FilterActions";

interface AdvancedSearchPopoverProps {
  onApplyFilters: (filters: PetPolicyFilterParams) => void;
  activeFilters: PetPolicyFilterParams;
  isLoading: boolean;
  showAsExpanded?: boolean;
}

export const AdvancedSearchPopover = ({
  onApplyFilters,
  activeFilters = {},
  isLoading,
  showAsExpanded = false
}: AdvancedSearchPopoverProps) => {
  const [localFilters, setLocalFilters] = useState<PetPolicyFilterParams>(activeFilters);

  const handleFilterChange = (key: keyof PetPolicyFilterParams, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    if (showAsExpanded) {
      onApplyFilters(newFilters);
    }
  };

  const applyFilters = () => {
    onApplyFilters(localFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {};
    setLocalFilters(clearedFilters);
    onApplyFilters(clearedFilters);
  };

  const filterContent = (
    <div className="space-y-6 p-4">
      <PetSizeTypeFilter 
        localFilters={localFilters}
        onFilterChange={handleFilterChange}
      />

      <TravelMethodFilter 
        localFilters={localFilters}
        onFilterChange={handleFilterChange}
      />

      <BreedRestrictionsFilter 
        localFilters={localFilters}
        onFilterChange={handleFilterChange}
      />

      {!showAsExpanded && (
        <FilterActions 
          onApplyFilters={applyFilters}
          onClearFilters={clearFilters}
          isLoading={isLoading}
        />
      )}
    </div>
  );

  if (showAsExpanded) {
    return filterContent;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="border-[#d4af37] text-[#1a365d] hover:bg-[#f7f1e8] font-bold"
          disabled={isLoading}
        >
          Advanced Filters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-[80vh] overflow-y-auto">
        {filterContent}
      </PopoverContent>
    </Popover>
  );
};
