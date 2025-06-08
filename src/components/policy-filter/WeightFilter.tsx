
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { WeightFilterOptions, TravelMethodFilter } from "@/types/policy-filters";

interface WeightFilterProps {
  options: WeightFilterOptions;
  onChange: (options: WeightFilterOptions) => void;
  travelMethod?: TravelMethodFilter;
}

export const WeightFilter = ({ options, onChange, travelMethod }: WeightFilterProps) => {
  const [showWarning, setShowWarning] = useState(false);

  // Determine the context label based on travel method
  const getWeightLabel = () => {
    if (!travelMethod) return "Pet Weight (kg)";
    
    const { cabin, cargo } = travelMethod;
    
    if (cabin && !cargo) {
      return "Max In-Cabin Weight (kg)";
    } else if (!cabin && cargo) {
      return "Max Cargo Weight (kg)";
    } else {
      return "Pet Weight (kg)";
    }
  };

  // Get helper text based on travel method
  const getHelperText = () => {
    if (!travelMethod) return "Enter your pet's weight";
    
    const { cabin, cargo } = travelMethod;
    
    if (cabin && !cargo) {
      return "Weight limit for in-cabin travel (typically 6-10kg)";
    } else if (!cabin && cargo) {
      return "Weight limit for cargo travel (can be much higher)";
    } else {
      return "Will match airlines that can accommodate this weight in either cabin or cargo";
    }
  };

  // Check if weight seems unrealistic for cabin travel
  useEffect(() => {
    if (travelMethod?.cabin && !travelMethod?.cargo && options.max) {
      setShowWarning(options.max > 15);
    } else {
      setShowWarning(false);
    }
  }, [options.max, travelMethod]);

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
        <Label htmlFor="max-weight" className="text-xs">{getWeightLabel()}</Label>
        <Input
          id="max-weight"
          type="number"
          min="0"
          max="100"
          placeholder="Enter pet weight"
          value={options.max || ""}
          onChange={handleMaxChange}
          className="h-8"
        />
        <p className="text-xs text-muted-foreground">{getHelperText()}</p>
      </div>

      {showWarning && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {options.max}kg is quite heavy for in-cabin travel. Most airlines limit cabin pets to 6-10kg including carrier.
          </AlertDescription>
        </Alert>
      )}
      
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
