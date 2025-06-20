
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PetPolicyFilterParams } from "@/types/policy-filters";

interface TravelMethodFilterProps {
  localFilters: PetPolicyFilterParams;
  onFilterChange: (key: keyof PetPolicyFilterParams, value: any) => void;
}

export const TravelMethodFilter = ({ localFilters, onFilterChange }: TravelMethodFilterProps) => {
  const handleTravelMethodChange = (method: 'cabin' | 'cargo', checked: boolean) => {
    const travelMethod = {
      ...localFilters.travelMethod,
      [method]: !!checked,
      [method === 'cabin' ? 'cargo' : 'cabin']: localFilters.travelMethod?.[method === 'cabin' ? 'cargo' : 'cabin'] || false
    };
    onFilterChange("travelMethod", travelMethod);
  };

  return (
    <div className="bg-white rounded-lg p-4 border-2 border-[#d4af37]">
      <h4 className="font-semibold text-[#1a365d] mb-3 text-lg">✈️ Travel Method</h4>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="cabin"
            checked={localFilters.travelMethod?.cabin || false}
            onCheckedChange={(checked) => handleTravelMethodChange('cabin', !!checked)}
          />
          <Label htmlFor="cabin" className="text-[#1a365d]">
            Cabin Travel (Recommended)
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="cargo"
            checked={localFilters.travelMethod?.cargo || false}
            onCheckedChange={(checked) => handleTravelMethodChange('cargo', !!checked)}
          />
          <Label htmlFor="cargo" className="text-[#8b0000]">
            ⚠️ Cargo Travel (Not Recommended)
          </Label>
        </div>
      </div>
    </div>
  );
};
