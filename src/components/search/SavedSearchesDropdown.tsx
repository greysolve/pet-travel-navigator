
import { format } from "date-fns";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SavedSearch } from "./types";

interface SavedSearchesDropdownProps {
  savedSearches: SavedSearch[];
  onLoadSearch: (searchCriteria: SavedSearch['search_criteria']) => void;
  onDeleteSearch: (e: React.MouseEvent, searchId: string) => void;
}

export const SavedSearchesDropdown = ({
  savedSearches,
  onLoadSearch,
  onDeleteSearch
}: SavedSearchesDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="w-full bg-white border-2 border-[#d4af37] text-[#1a365d] font-bold py-4 rounded-lg hover:bg-[#f7f1e8] transition-all duration-300">
          My Saved Searches
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]">
        {savedSearches.length === 0 ? (
          <DropdownMenuItem disabled>No saved searches</DropdownMenuItem>
        ) : (
          savedSearches.map((search) => (
            <DropdownMenuItem
              key={search.id}
              onClick={() => onLoadSearch(search.search_criteria)}
              className="flex items-center justify-between py-2 group relative"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {`${search.search_criteria.origin} → ${search.search_criteria.destination}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(search.created_at), 'MMM d, yyyy')}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2"
                onClick={(e) => onDeleteSearch(e, search.id)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Delete saved search</span>
              </Button>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
