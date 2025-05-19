
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TravelMethodFilter as TravelMethodFilterValue } from "@/types/policy-filters";

interface TravelMethodFilterProps {
  selectedMethod: TravelMethodFilterValue;
  onChange: (method: TravelMethodFilterValue) => void;
}

export const TravelMethodFilter = ({ selectedMethod, onChange }: TravelMethodFilterProps) => {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium mb-2">Travel Method</p>
      <RadioGroup
        value={selectedMethod}
        onValueChange={(value) => onChange(value as TravelMethodFilterValue)}
        className="flex flex-col space-y-1"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="cabin" id="travel-cabin" />
          <Label htmlFor="travel-cabin">Cabin Only</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="cargo" id="travel-cargo" />
          <Label htmlFor="travel-cargo">Cargo Only</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="both" id="travel-both" />
          <Label htmlFor="travel-both">Both Options</Label>
        </div>
      </RadioGroup>
    </div>
  );
};
