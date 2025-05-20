
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TravelMethodFilter as TravelMethodFilterValue } from "@/types/policy-filters";

interface TravelMethodFilterProps {
  selectedMethod: TravelMethodFilterValue;
  onChange: (method: TravelMethodFilterValue) => void;
}

export const TravelMethodFilter = ({ selectedMethod, onChange }: TravelMethodFilterProps) => {
  // Set default values if undefined
  const { cabin = true, cargo = true } = selectedMethod || {};
  
  const handleCabinChange = (checked: boolean) => {
    onChange({ ...selectedMethod, cabin: checked });
  };
  
  const handleCargoChange = (checked: boolean) => {
    onChange({ ...selectedMethod, cargo: checked });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium mb-2">Travel Method</p>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="travel-cabin"
            checked={cabin}
            onCheckedChange={handleCabinChange}
          />
          <Label htmlFor="travel-cabin" className="text-sm cursor-pointer">In Cabin</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="travel-cargo"
            checked={cargo}
            onCheckedChange={handleCargoChange}
          />
          <Label htmlFor="travel-cargo" className="text-sm cursor-pointer">In Cargo</Label>
        </div>
      </div>
    </div>
  );
};
