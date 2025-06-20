
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PetTypeFilter } from "../policy-filter/PetTypeFilter";
import { TravelMethodFilter } from "../policy-filter/TravelMethodFilter";
import { WeightFilter } from "../policy-filter/WeightFilter";
import { BreedRestrictionsFilter } from "../policy-filter/BreedRestrictionsFilter";
import { PetPolicyFilterParams, TravelMethodFilter as TravelMethodFilterType } from "@/types/policy-filters";

interface AdvancedSearchPopoverProps {
  onApplyFilters: (filters: PetPolicyFilterParams) => void;
  activeFilters: PetPolicyFilterParams;
  isLoading?: boolean;
  showAsExpanded?: boolean;
}

export const AdvancedSearchPopover = ({ 
  onApplyFilters, 
  activeFilters, 
  isLoading = false,
  showAsExpanded = false
}: AdvancedSearchPopoverProps) => {
  const [localFilters, setLocalFilters] = useState<PetPolicyFilterParams>(activeFilters);

  useEffect(() => {
    setLocalFilters(activeFilters);
  }, [activeFilters]);

  const handleFilterChange = (filterType: keyof PetPolicyFilterParams, value: any) => {
    const newFilters = { ...localFilters, [filterType]: value };
    setLocalFilters(newFilters);
    onApplyFilters(newFilters);
  };

  const FilterContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* Your Companion */}
      <div className="bg-white p-5 rounded-lg border border-[#d4af37]">
        <h4 className="text-lg font-semibold text-[#1a365d] mb-3 flex items-center gap-2">
          🐕 Your Companion
        </h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              className="w-4 h-4 accent-[#d4af37]"
              checked={localFilters.petTypes?.includes('dog') || false}
              onChange={(e) => {
                const currentTypes = localFilters.petTypes || [];
                const newTypes = e.target.checked 
                  ? [...currentTypes.filter(t => t !== 'dog'), 'dog']
                  : currentTypes.filter(t => t !== 'dog');
                handleFilterChange('petTypes', newTypes.length > 0 ? newTypes : undefined);
              }}
            />
            <span className="font-medium text-[#8b0000]">Small Dog (Under 15lbs/7kg)</span>
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              className="w-4 h-4 accent-[#d4af37]"
              checked={localFilters.petTypes?.includes('large-dog') || false}
              onChange={(e) => {
                const currentTypes = localFilters.petTypes || [];
                const newTypes = e.target.checked 
                  ? [...currentTypes.filter(t => t !== 'large-dog'), 'large-dog']
                  : currentTypes.filter(t => t !== 'large-dog');
                handleFilterChange('petTypes', newTypes.length > 0 ? newTypes : undefined);
              }}
            />
            <span className="font-medium text-[#2d5a87]">Large Dog (15lbs+/7kg+)</span>
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              className="w-4 h-4 accent-[#d4af37]"
              checked={localFilters.petTypes?.includes('cat') || false}
              onChange={(e) => {
                const currentTypes = localFilters.petTypes || [];
                const newTypes = e.target.checked 
                  ? [...currentTypes.filter(t => t !== 'cat'), 'cat']
                  : currentTypes.filter(t => t !== 'cat');
                handleFilterChange('petTypes', newTypes.length > 0 ? newTypes : undefined);
              }}
            />
            <span className="font-medium text-[#2d5a87]">Cat</span>
          </label>
        </div>
      </div>

      {/* Travel Style */}
      <div className="bg-white p-5 rounded-lg border border-[#d4af37]">
        <h4 className="text-lg font-semibold text-[#1a365d] mb-3 flex items-center gap-2">
          ✈️ Travel Style
        </h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              className="w-4 h-4 accent-[#d4af37]"
              checked={localFilters.travelMethod?.cabin || false}
              onChange={(e) => {
                const currentMethod = localFilters.travelMethod as TravelMethodFilterType || { cabin: true, cargo: true };
                handleFilterChange('travelMethod', { ...currentMethod, cabin: e.target.checked });
              }}
            />
            <span className="font-medium text-[#8b0000]">Cabin Only (With You)</span>
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              className="w-4 h-4 accent-[#d4af37]"
              checked={localFilters.travelMethod?.cargo || false}
              onChange={(e) => {
                const currentMethod = localFilters.travelMethod as TravelMethodFilterType || { cabin: true, cargo: true };
                handleFilterChange('travelMethod', { ...currentMethod, cargo: e.target.checked });
              }}
            />
            <span className="font-medium text-[#2d5a87]">Cargo (Not Recommended)</span>
          </label>
        </div>
      </div>

      {/* Service Level */}
      <div className="bg-white p-5 rounded-lg border border-[#d4af37]">
        <h4 className="text-lg font-semibold text-[#1a365d] mb-3 flex items-center gap-2">
          🏆 Service Level
        </h4>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              className="w-4 h-4 accent-[#d4af37]"
              checked={localFilters.includeBreedRestrictions !== false}
              onChange={(e) => {
                handleFilterChange('includeBreedRestrictions', e.target.checked);
              }}
            />
            <span className="font-medium text-[#8b0000]">Pet-Friendly Airlines Only</span>
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              className="w-4 h-4 accent-[#d4af37]"
              disabled
            />
            <span className="font-medium text-[#8b0000]">Include Luxury Hotel Options</span>
          </label>
        </div>
      </div>
    </div>
  );

  if (showAsExpanded) {
    return <FilterContent />;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="border-[#d4af37] text-[#1a365d] hover:bg-[#f7f1e8]"
          disabled={isLoading}
        >
          <Settings2 className="mr-2 h-4 w-4" />
          Advanced Filters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-6 bg-gradient-to-br from-[#f7f1e8] to-[#ede0d3] border-2 border-[#d4af37]">
        <FilterContent />
      </PopoverContent>
    </Popover>
  );
};
