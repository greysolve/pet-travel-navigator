
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PetPolicyFilterParams } from "@/types/policy-filters";

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
      {/* Pet Size & Type */}
      <div className="bg-white rounded-lg p-4 border-2 border-[#d4af37]">
        <h4 className="font-semibold text-[#1a365d] mb-3 text-lg">🐕 Pet Size & Type</h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="small-dog"
              checked={localFilters.petTypes?.includes('dog')}
              onCheckedChange={(checked) => {
                const petTypes = checked 
                  ? [...(localFilters.petTypes || []), 'dog']
                  : (localFilters.petTypes || []).filter(type => type !== 'dog');
                handleFilterChange("petTypes", petTypes.length > 0 ? petTypes : undefined);
              }}
            />
            <Label htmlFor="small-dog" className="text-[#1a365d]">
              Small Dogs (Under 15lbs/7kg) - Cabin Only
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cat"
              checked={localFilters.petTypes?.includes('cat')}
              onCheckedChange={(checked) => {
                const petTypes = checked 
                  ? [...(localFilters.petTypes || []), 'cat']
                  : (localFilters.petTypes || []).filter(type => type !== 'cat');
                handleFilterChange("petTypes", petTypes.length > 0 ? petTypes : undefined);
              }}
            />
            <Label htmlFor="cat" className="text-[#1a365d]">
              Cats (Cabin-Friendly Sizes)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="other-pet"
              checked={localFilters.petTypes?.includes('other')}
              onCheckedChange={(checked) => {
                const petTypes = checked 
                  ? [...(localFilters.petTypes || []), 'other']
                  : (localFilters.petTypes || []).filter(type => type !== 'other');
                handleFilterChange("petTypes", petTypes.length > 0 ? petTypes : undefined);
              }}
            />
            <Label htmlFor="other-pet" className="text-[#8b0000]">
              ⚠️ Large Dogs (Cargo/Special Handling)
            </Label>
          </div>
        </div>
      </div>

      {/* Travel Method */}
      <div className="bg-white rounded-lg p-4 border-2 border-[#d4af37]">
        <h4 className="font-semibold text-[#1a365d] mb-3 text-lg">✈️ Travel Method</h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cabin"
              checked={localFilters.travelMethod?.cabin || false}
              onCheckedChange={(checked) => {
                const travelMethod = {
                  ...localFilters.travelMethod,
                  cabin: checked || false,
                  cargo: localFilters.travelMethod?.cargo || false
                };
                handleFilterChange("travelMethod", travelMethod);
              }}
            />
            <Label htmlFor="cabin" className="text-[#1a365d]">
              Cabin Travel (Recommended)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cargo"
              checked={localFilters.travelMethod?.cargo || false}
              onCheckedChange={(checked) => {
                const travelMethod = {
                  ...localFilters.travelMethod,
                  cabin: localFilters.travelMethod?.cabin || false,
                  cargo: checked || false
                };
                handleFilterChange("travelMethod", travelMethod);
              }}
            />
            <Label htmlFor="cargo" className="text-[#8b0000]">
              ⚠️ Cargo Travel (Not Recommended)
            </Label>
          </div>
        </div>
      </div>

      {/* Special Requirements */}
      <div className="bg-white rounded-lg p-4 border-2 border-[#d4af37]">
        <h4 className="font-semibold text-[#1a365d] mb-3 text-lg">⭐ Special Requirements</h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="emotional-support"
              checked={localFilters.includeBreedRestrictions === false}
              onCheckedChange={(checked) => 
                handleFilterChange("includeBreedRestrictions", checked ? false : undefined)
              }
            />
            <Label htmlFor="emotional-support" className="text-[#8b0000]">
              📋 ESA/Service Animal Documentation Required
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="breed-restrictions"
              checked={localFilters.includeBreedRestrictions === true}
              onCheckedChange={(checked) => 
                handleFilterChange("includeBreedRestrictions", checked ? true : undefined)
              }
            />
            <Label htmlFor="breed-restrictions" className="text-[#1a365d]">
              🚫 No Breed Restrictions
            </Label>
          </div>
        </div>
      </div>

      {!showAsExpanded && (
        <div className="flex gap-2 pt-4">
          <Button 
            onClick={applyFilters} 
            className="flex-1 bg-[#d4af37] hover:bg-[#f4d03f] text-[#1a365d] font-bold"
            disabled={isLoading}
          >
            Apply Filters
          </Button>
          <Button 
            variant="outline" 
            onClick={clearFilters}
            className="border-[#d4af37] text-[#1a365d] hover:bg-[#f7f1e8]"
            disabled={isLoading}
          >
            Clear
          </Button>
        </div>
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
