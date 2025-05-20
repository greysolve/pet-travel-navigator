
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { WeightFilterOptions } from "@/types/policy-filters";

interface WeightFilterProps {
  options: WeightFilterOptions;
  onChange: (options: WeightFilterOptions) => void;
}

export const WeightFilter = ({ options, onChange }: WeightFilterProps) => {
  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? Number(e.target.value) : undefined;
    onChange({ ...options, max: value });
  };

  const handleCarrierChange = (checked: boolean) => {
    onChange({ ...options, includeCarrier: checked });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">Weight Restrictions</p>
      
      <div className="space-y-1">
        <Label htmlFor="max-weight" className="text-xs">Pet Weight (kg)</Label>
        <Input
          id="max-weight"
          type="number"
          min="0"
          placeholder="Enter pet weight"
          value={options.max || ""}
          onChange={handleMaxChange}
          className="h-8"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="include-carrier"
          checked={options.includeCarrier || false}
          onCheckedChange={handleCarrierChange}
        />
        <Label 
          htmlFor="include-carrier" 
          className="text-sm leading-none cursor-pointer"
        >
          Weight includes carrier
          <span className="text-xs text-muted-foreground ml-1">(informational only)</span>
        </Label>
      </div>
    </div>
  );
};
