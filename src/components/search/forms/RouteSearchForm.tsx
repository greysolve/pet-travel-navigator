
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteSearchFormProps {
  origin: string;
  destination: string;
  setOrigin: (value: string) => void;
  setDestination: (value: string) => void;
  date?: Date;
  setDate: (date: Date | undefined) => void;
  isLoading: boolean;
  policySearch: string;
  clearPolicySearch: () => void;
  shouldSaveSearch: boolean;
  setShouldSaveSearch: (value: boolean) => void;
  user: any;
  toast: any;
  onSearchResults: any;
  setFlights: any;
}

export const RouteSearchForm = ({
  origin,
  destination,
  setOrigin,
  setDestination,
  date,
  setDate,
  isLoading,
  policySearch,
  clearPolicySearch,
  shouldSaveSearch,
  setShouldSaveSearch
}: RouteSearchFormProps) => {
  return (
    <div className="space-y-5">
      {/* From/To Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col">
          <label className="text-lg font-semibold text-[#1a365d] mb-2 font-serif flex items-center gap-2">
            🛫 From
          </label>
          <div className="relative">
            <Input
              placeholder="Origin city or airport code"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="text-lg py-4 px-4 border-2 border-[#e2e8f0] rounded-lg bg-white focus:border-[#d4af37] focus:ring-3 focus:ring-[rgba(212,175,55,0.2)] transition-all duration-300"
              disabled={isLoading}
            />
            {policySearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearPolicySearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-lg font-semibold text-[#1a365d] mb-2 font-serif flex items-center gap-2">
            🛬 To
          </label>
          <Input
            placeholder="Destination city or airport code"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="text-lg py-4 px-4 border-2 border-[#e2e8f0] rounded-lg bg-white focus:border-[#d4af37] focus:ring-3 focus:ring-[rgba(212,175,55,0.2)] transition-all duration-300"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Date and Save Search Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
        <div className="flex flex-col">
          <label className="text-lg font-semibold text-[#1a365d] mb-2 font-serif flex items-center gap-2">
            📅 Departure Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal text-lg py-4 px-4 border-2 border-[#e2e8f0] rounded-lg bg-white hover:bg-white focus:border-[#d4af37] transition-all duration-300",
                  !date && "text-muted-foreground"
                )}
                disabled={isLoading}
              >
                <CalendarIcon className="mr-2 h-5 w-5" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col justify-end">
          <div className="flex items-center gap-2 py-4">
            <input
              type="checkbox"
              id="save-search"
              checked={shouldSaveSearch}
              onChange={(e) => setShouldSaveSearch(e.target.checked)}
              className="w-5 h-5 accent-[#d4af37]"
            />
            <label htmlFor="save-search" className="text-[#2d5a87] font-medium text-lg">
              Save this search for future trips
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
