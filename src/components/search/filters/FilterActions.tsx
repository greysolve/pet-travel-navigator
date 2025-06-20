
import { Button } from "@/components/ui/button";

interface FilterActionsProps {
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isLoading: boolean;
}

export const FilterActions = ({ onApplyFilters, onClearFilters, isLoading }: FilterActionsProps) => {
  return (
    <div className="flex gap-2 pt-4">
      <Button 
        onClick={onApplyFilters} 
        className="flex-1 bg-[#d4af37] hover:bg-[#f4d03f] text-[#1a365d] font-bold"
        disabled={isLoading}
      >
        Apply Filters
      </Button>
      <Button 
        variant="outline" 
        onClick={onClearFilters}
        className="border-[#d4af37] text-[#1a365d] hover:bg-[#f7f1e8]"
        disabled={isLoading}
      >
        Clear
      </Button>
    </div>
  );
};
