
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SaveSearchProps {
  shouldSaveSearch: boolean;
  setShouldSaveSearch: (checked: boolean) => void;
  user: any;
  isProfileLoading: boolean;
}

export const SaveSearch = ({
  shouldSaveSearch,
  setShouldSaveSearch,
  user,
  isProfileLoading
}: SaveSearchProps) => {
  if (!user) return null;

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id="save-search"
        checked={shouldSaveSearch}
        onCheckedChange={(checked) => setShouldSaveSearch(checked as boolean)}
        disabled={isProfileLoading}
      />
      <Label
        htmlFor="save-search"
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          isProfileLoading && "opacity-50"
        )}
      >
        Save this search
      </Label>
    </div>
  );
};
