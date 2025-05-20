
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface BreedRestrictionsFilterProps {
  includeBreedRestrictions: boolean;
  onChange: (include: boolean) => void;
}

export const BreedRestrictionsFilter = ({ 
  includeBreedRestrictions, 
  onChange 
}: BreedRestrictionsFilterProps) => {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium mb-2">Breed Restrictions</p>
      <div className="flex items-center space-x-2">
        <Switch
          id="breed-restrictions"
          checked={!includeBreedRestrictions}
          onCheckedChange={(checked) => onChange(!checked)}
        />
        <Label htmlFor="breed-restrictions" className="text-sm">
          Show only airlines with no breed restrictions
        </Label>
      </div>
    </div>
  );
};
