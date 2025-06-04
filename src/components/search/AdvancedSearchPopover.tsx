
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { PetTypeFilter } from "../policy-filter/PetTypeFilter";
import { TravelMethodFilter } from "../policy-filter/TravelMethodFilter";
import { WeightFilter } from "../policy-filter/WeightFilter";
import { BreedRestrictionsFilter } from "../policy-filter/BreedRestrictionsFilter";
import { 
  PetPolicyFilterParams,
  PetTypeFilter as PetTypeFilterValue,
  TravelMethodFilter as TravelMethodFilterValue,
  WeightFilterOptions 
} from "@/types/policy-filters";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AdvancedSearchPopoverProps {
  onApplyFilters: (filters: PetPolicyFilterParams) => void;
  activeFilters: PetPolicyFilterParams;
  isLoading?: boolean;
}

export const AdvancedSearchPopover = ({ 
  onApplyFilters, 
  activeFilters,
  isLoading 
}: AdvancedSearchPopoverProps) => {
  const [petTypes, setPetTypes] = useState<PetTypeFilterValue[]>(activeFilters.petTypes || []);
  const [travelMethod, setTravelMethod] = useState<TravelMethodFilterValue>(
    activeFilters.travelMethod || { cabin: true, cargo: true }
  );
  const [weightOptions, setWeightOptions] = useState<WeightFilterOptions>({
    max: activeFilters.maxWeight,
    includeCarrier: activeFilters.weightIncludesCarrier
  });
  const [includeBreedRestrictions, setIncludeBreedRestrictions] = useState(
    activeFilters.includeBreedRestrictions !== false
  );
  const [isOpen, setIsOpen] = useState(false);

  const handleApplyFilters = () => {
    const filters: PetPolicyFilterParams = {
      petTypes: petTypes.length > 0 ? petTypes : undefined,
      travelMethod,
      maxWeight: weightOptions.max,
      weightIncludesCarrier: weightOptions.includeCarrier,
      includeBreedRestrictions
    };
    
    onApplyFilters(filters);
    setIsOpen(false);
  };

  const handleResetFilters = () => {
    setPetTypes([]);
    setTravelMethod({ cabin: true, cargo: true });
    setWeightOptions({});
    setIncludeBreedRestrictions(true);
    onApplyFilters({});
  };

  // Calculate if there are any active filters
  const hasActiveFilters = 
    (activeFilters.petTypes && activeFilters.petTypes.length > 0) || 
    (activeFilters.travelMethod && (!activeFilters.travelMethod.cabin || !activeFilters.travelMethod.cargo)) || 
    activeFilters.maxWeight !== undefined || 
    activeFilters.includeBreedRestrictions === false;

  const getFilterBadges = () => {
    const badges = [];
    
    if (activeFilters.petTypes && activeFilters.petTypes.length > 0) {
      const petTypeLabel = activeFilters.petTypes.length === 1 
        ? activeFilters.petTypes[0] 
        : `${activeFilters.petTypes.length} pet types`;
        
      badges.push({
        key: 'pet-types',
        label: `Pet: ${petTypeLabel}`
      });
    }
    
    if (activeFilters.travelMethod) {
      const { cabin, cargo } = activeFilters.travelMethod;
      
      if (cabin && !cargo) {
        badges.push({
          key: 'travel-method',
          label: 'Method: Cabin only'
        });
      } else if (!cabin && cargo) {
        badges.push({
          key: 'travel-method',
          label: 'Method: Cargo only'
        });
      }
    }
    
    if (activeFilters.maxWeight !== undefined) {
      const methodContext = activeFilters.travelMethod;
      let weightLabel = `Weight: ${activeFilters.maxWeight}kg`;
      
      if (methodContext?.cabin && !methodContext?.cargo) {
        weightLabel = `Cabin weight: ${activeFilters.maxWeight}kg`;
      } else if (!methodContext?.cabin && methodContext?.cargo) {
        weightLabel = `Cargo weight: ${activeFilters.maxWeight}kg`;
      }
      
      badges.push({
        key: 'weight',
        label: weightLabel
      });
    }
    
    if (activeFilters.includeBreedRestrictions === false) {
      badges.push({
        key: 'breed-restrictions',
        label: "No breed restrictions"
      });
    }
    
    return badges;
  };

  return (
    <div className="flex flex-col">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`flex items-center gap-1 px-2 ${hasActiveFilters ? 'text-primary' : ''}`}
                  disabled={isLoading}
                >
                  <Filter className="h-4 w-4" />
                  Advanced Filters
                  {hasActiveFilters && (
                    <Badge 
                      variant="secondary" 
                      className="ml-1 bg-primary/10 text-primary text-xs px-2 h-5"
                    >
                      {getFilterBadges().length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 max-h-[85vh] overflow-y-auto p-4" align="start">
                <h4 className="font-medium mb-3">Advanced Pet Filters</h4>
                
                <div className="space-y-5">
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
                    travelMethod={travelMethod}
                  />
                  <BreedRestrictionsFilter 
                    includeBreedRestrictions={includeBreedRestrictions} 
                    onChange={setIncludeBreedRestrictions} 
                  />
                </div>
                
                <div className="flex justify-end gap-2 mt-5 pt-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleResetFilters}
                    disabled={!petTypes.length && travelMethod.cabin && travelMethod.cargo && 
                      !weightOptions.min && !weightOptions.max && includeBreedRestrictions}
                  >
                    <X className="h-4 w-4 mr-1" /> Reset
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleApplyFilters}
                  >
                    <Filter className="h-4 w-4 mr-1" /> Apply Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </TooltipTrigger>
          <TooltipContent>
            Filter for pet-friendly airlines
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1 mt-1">
          {getFilterBadges().map((badge) => (
            <Badge 
              key={badge.key} 
              variant="outline" 
              className="text-xs bg-primary/5 hover:bg-primary/10"
            >
              {badge.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
