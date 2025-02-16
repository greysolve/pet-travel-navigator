import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "use-debounce";
import type { AirlinePolicySearchProps } from "./types";

type Airline = {
  name: string;
  iata_code: string | null;
};

export const AirlinePolicySearch = ({ 
  policySearch, 
  setPolicySearch,
  isLoading,
  disabled,
  onFocus
}: AirlinePolicySearchProps) => {
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAirlineSuggestions, setShowAirlineSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [debouncedFetch] = useDebounce(
    async (searchTerm: string) => {
      if (!searchTerm || searchTerm.length < 2) {
        setAirlines([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('airlines')
          .select('name, iata_code')
          .or(`name.ilike.%${searchTerm}%,iata_code.ilike.%${searchTerm}%`)
          .limit(10);

        if (error) {
          console.error('Error fetching airlines:', error);
          toast({
            title: "Error fetching airlines",
            description: "Please try again",
            variant: "destructive",
          });
          return;
        }

        setAirlines(data || []);
      } finally {
        setIsSearching(false);
      }
    },
    300 // 300ms delay
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPolicySearch(value);
    if (value.length >= 2) {
      debouncedFetch(value);
      setShowAirlineSuggestions(true);
    } else {
      setAirlines([]);
      setShowAirlineSuggestions(false);
    }
  };

  const handleSuggestionClick = (airlineName: string) => {
    setPolicySearch(airlineName);
    setShowAirlineSuggestions(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        placeholder="Search for airline pet policies..."
        className="h-12 text-lg bg-white/90 border-0 shadow-sm"
        value={policySearch}
        onChange={handleInputChange}
        onFocus={() => {
          if (policySearch.length >= 2) {
            setShowAirlineSuggestions(true);
          }
          onFocus?.();
        }}
        disabled={disabled}
      />
      {showAirlineSuggestions && airlines.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg suggestions-list">
          {isSearching ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <ul className="max-h-60 overflow-auto py-1">
              {airlines.map((airline) => (
                <li
                  key={airline.iata_code || airline.name}
                  className="px-4 py-2 hover:bg-accent cursor-pointer"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                    handleSuggestionClick(airline.name);
                  }}
                >
                  {airline.name} {airline.iata_code ? `(${airline.iata_code})` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
