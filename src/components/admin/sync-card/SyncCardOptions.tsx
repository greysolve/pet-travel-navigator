
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatTitle } from "./utils";

interface SyncCardOptionsProps {
  title: string;
  clearData: boolean;
  onClearDataChange: (checked: boolean) => void;
  isLoading: boolean;
  isSyncInProgress: boolean;
  forceContentComparison?: boolean;
  onForceContentComparisonChange?: (checked: boolean) => void;
  showForceContentComparison?: boolean;
}

export const SyncCardOptions = ({
  title,
  clearData,
  onClearDataChange,
  isLoading,
  isSyncInProgress,
  forceContentComparison = false,
  onForceContentComparisonChange,
  showForceContentComparison = false,
}: SyncCardOptionsProps) => {
  const formattedTitle = formatTitle(title);
  
  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center space-x-3">
        <Checkbox 
          id={`clear${title.replace(/\s+/g, '')}`}
          checked={clearData}
          onCheckedChange={(checked) => onClearDataChange(checked === true)}
          disabled={isLoading || isSyncInProgress}
        />
        <Label 
          htmlFor={`clear${title.replace(/\s+/g, '')}`} 
          className={cn("text-lg", (isLoading || isSyncInProgress) && "opacity-50")}
        >
          Clear existing {formattedTitle.toLowerCase()} data first
        </Label>
      </div>

      {showForceContentComparison && onForceContentComparisonChange && (
        <div className="flex items-center space-x-3 pt-2">
          <Checkbox 
            id={`force-content${title.replace(/\s+/g, '')}`}
            checked={forceContentComparison}
            onCheckedChange={(checked) => onForceContentComparisonChange(checked === true)}
            disabled={isLoading || isSyncInProgress}
          />
          <Label 
            htmlFor={`force-content${title.replace(/\s+/g, '')}`} 
            className={cn("text-lg", (isLoading || isSyncInProgress) && "opacity-50")}
          >
            Force content comparison (detects policy changes regardless of timestamps)
          </Label>
        </div>
      )}
    </div>
  );
};
