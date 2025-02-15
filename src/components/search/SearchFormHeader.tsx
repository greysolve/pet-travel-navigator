
import { Loader2, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SavedSearchesDropdown } from "./SavedSearchesDropdown";
import type { SearchFormHeaderProps } from "./types";
import { Link } from "react-router-dom";

export const SearchFormHeader = ({
  user,
  isPetCaddie,
  searchCount,
  savedSearches,
  onLoadSearch,
  onDeleteSearch,
  isLoading
}: SearchFormHeaderProps) => {
  if (!user) return null;

  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {isPetCaddie && (
          <>
            <span>
              Remaining searches: {searchCount ?? 0}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-primary" 
              asChild
            >
              <Link to="/pricing">
                <ArrowUp className="mr-1 h-4 w-4" />
                Upgrade
              </Link>
            </Button>
          </>
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

