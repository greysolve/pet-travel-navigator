
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PetPolicyFilterParams } from "@/types/policy-filters";

interface BreedRestrictionsFilterProps {
  localFilters: PetPolicyFilterParams;
  onFilterChange: (key: keyof PetPolicyFilterParams, value: any) => void;
}

export const BreedRestrictionsFilter = ({ localFilters, onFilterChange }: BreedRestrictionsFilterProps) => {
  return (
    <div className="bg-white rounded-lg p-4 border-2 border-[#d4af37]">
      <h4 className="font-semibold text-[#1a365d] mb-3 text-lg">⭐ Special Requirements</h4>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="breed-restrictions"
            checked={localFilters.includeBreedRestrictions === true}
            onCheckedChange={(checked) => 
              onFilterChange("includeBreedRestrictions", checked ? true : undefined)
            }
          />
          <Label htmlFor="breed-restrictions" className="text-[#1a365d]">
            🚫 No Breed Restrictions
          </Label>
        </div>
      </div>
    </div>
  );
};
