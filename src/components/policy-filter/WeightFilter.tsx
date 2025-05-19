
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
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? Number(e.target.value) : undefined;
    onChange({ ...options, min: value });
  };

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
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="min-weight" className="text-xs">Min Weight (kg)</Label>
          <Input
            id="min-weight"
            type="number"
            min="0"
            placeholder="Min"
            value={options.min || ""}
            onChange={handleMinChange}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="max-weight" className="text-xs">Max Weight (kg)</Label>
          <Input
            id="max-weight"
            type="number"
            min="0"
            placeholder="Max"
            value={options.max || ""}
            onChange={handleMaxChange}
            className="h-8"
          />
        </div>
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
        </Label>
      </div>
    </div>
  );
};
