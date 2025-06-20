
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface PolicySearchFormProps {
  policySearch: string;
  setPolicySearch: (value: string) => void;
  isLoading: boolean;
  hasRouteSearch: boolean;
  clearRouteSearch: () => void;
  user: any;
  toast: any;
  onSearchResults: any;
  setFlights: any;
  onPolicySearch: () => Promise<void>;
}

export const PolicySearchForm = ({
  policySearch,
  setPolicySearch,
  isLoading,
  hasRouteSearch,
  clearRouteSearch
}: PolicySearchFormProps) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col">
        <label className="text-lg font-semibold text-[#1a365d] mb-2 font-serif flex items-center gap-2">
          ✈️ Preferred Airlines (Optional)
        </label>
        <div className="relative">
          <Input
            placeholder="e.g., American, Delta - cabin-friendly only"
            value={policySearch}
            onChange={(e) => setPolicySearch(e.target.value)}
            className="text-lg py-4 px-4 border-2 border-[#e2e8f0] rounded-lg bg-white focus:border-[#d4af37] focus:ring-3 focus:ring-[rgba(212,175,55,0.2)] transition-all duration-300"
            disabled={isLoading}
          />
          {hasRouteSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearRouteSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
