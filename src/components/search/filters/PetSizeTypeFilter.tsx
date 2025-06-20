
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PetPolicyFilterParams } from "@/types/policy-filters";

interface PetSizeTypeFilterProps {
  localFilters: PetPolicyFilterParams;
  onFilterChange: (key: keyof PetPolicyFilterParams, value: any) => void;
}

export const PetSizeTypeFilter = ({ localFilters, onFilterChange }: PetSizeTypeFilterProps) => {
  const handlePetTypeChange = (petType: string, checked: boolean) => {
    const petTypes = checked 
      ? [...(localFilters.petTypes || []), petType]
      : (localFilters.petTypes || []).filter(type => type !== petType);
    onFilterChange("petTypes", petTypes.length > 0 ? petTypes : undefined);
  };

  return (
    <div className="bg-white rounded-lg p-4 border-2 border-[#d4af37]">
      <h4 className="font-semibold text-[#1a365d] mb-3 text-lg">🐕 Pet Size & Type</h4>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="small-dog"
            checked={localFilters.petTypes?.includes('dog')}
            onCheckedChange={(checked) => handlePetTypeChange('dog', !!checked)}
          />
          <Label htmlFor="small-dog" className="text-[#1a365d]">
            Small Dogs (Under 15lbs/7kg) - Cabin Only
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="cat"
            checked={localFilters.petTypes?.includes('cat')}
            onCheckedChange={(checked) => handlePetTypeChange('cat', !!checked)}
          />
          <Label htmlFor="cat" className="text-[#1a365d]">
            Cats (Cabin-Friendly Sizes)
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="other-pet"
            checked={localFilters.petTypes?.includes('other')}
            onCheckedChange={(checked) => handlePetTypeChange('other', !!checked)}
          />
          <Label htmlFor="other-pet" className="text-[#8b0000]">
            ⚠️ Large Dogs (Cargo/Special Handling)
          </Label>
        </div>
      </div>
    </div>
  );
};
