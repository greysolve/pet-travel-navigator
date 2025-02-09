
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SavedSearchesDropdown } from "./SavedSearchesDropdown";
import type { SavedSearch } from "./types";

interface SearchFormHeaderProps {
  user: any;
  isPetCaddie: boolean;
  searchCount: number | undefined;
  savedSearches: SavedSearch[];
  onLoadSearch: (searchCriteria: SavedSearch['search_criteria']) => void;
  onDeleteSearch: (e: React.MouseEvent, searchId: string) => void;
}

export const SearchFormHeader = ({
  user,
  isPetCaddie,
  searchCount,
  savedSearches,
  onLoadSearch,
  onDeleteSearch
}: SearchFormHeaderProps) => {
  if (!user) return null;

  return (
    <div className="flex justify-between items-center mb-4">
      <div className="text-sm text-muted-foreground">
        {isPetCaddie && (
          <span>
            Remaining searches: {searchCount ?? 0}
          </span>
        )}
      </div>
      <SavedSearchesDropdown
        savedSearches={savedSearches}
        onLoadSearch={onLoadSearch}
        onDeleteSearch={onDeleteSearch}
      />
    </div>
  );
};
