
import { useState, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Change: policySearch now is always the selected IATA code or blank
export interface AirlinePolicySearchProps {
  policySearch: string; // Actually the IATA code, or empty string
  setPolicySearch: (value: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  onFocus?: () => void;
  setPolicySearchDisplay?: (value: string) => void; // optional
}

export const AirlinePolicySearch = ({
  policySearch,
  setPolicySearch,
  isLoading,
  disabled,
  onFocus,
  setPolicySearchDisplay,
}: AirlinePolicySearchProps) => {
  const [airlines, setAirlines] = useState<Array<{iata: string, name: string}>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(""); // For textbox display (Name (IATA))
  const [dropdownSelected, setDropdownSelected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchAirlines = useCallback(async (searchTerm: string) => {
    // Only search if at least 2 chars
    if (!searchTerm || searchTerm.length < 2) {
      setAirlines([]);
      return;
    }
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('airlines')
        .select('iata_code, name')
        .or(`iata_code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
        .order('name')
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

      const formattedData = data.map(airline => ({
        iata: airline.iata_code || '',
        name: airline.name
      }));

      setAirlines(formattedData);
    } catch (error) {
      console.error('Error fetching airlines:', error);
      toast({
        title: "Error fetching airlines",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  // Only allow a search if inputValue matches a real airline (dropdown selected)
  const allowSearch = airlines.some(a => `${a.name} (${a.iata})`.toLowerCase() === inputValue.toLowerCase());

  // When the user types
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDropdownSelected(false);
    const value = e.target.value;
    setInputValue(value);
    setPolicySearch(""); // No IATA set until selected
    fetchAirlines(value);
    setShowSuggestions(true);
    if (setPolicySearchDisplay) setPolicySearchDisplay(value);
  };

  // When the user selects a suggestion
  const handleSelect = (airline: {iata: string; name: string}) => {
    const display = `${airline.name} (${airline.iata})`;
    setInputValue(display);
    setPolicySearch(airline.iata); // Only IATA is passed upward
    setDropdownSelected(true);
    setShowSuggestions(false);
    if (setPolicySearchDisplay) setPolicySearchDisplay(display);

    // Move focus away to close suggestions nicely
    setTimeout(() => {
      inputRef.current?.blur();
    }, 0);
  };

  // Handle losing focus (hide suggestions after small delay for click)
  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 150);
  };

  // When user focuses, clear and show dropdown
  const handleFocus = () => {
    setShowSuggestions(true);
    if (onFocus) onFocus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Airline name or code (e.g., American, AA)"
          className="h-12 text-base bg-white shadow-sm pl-10"
          value={inputValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={isLoading || disabled}
          autoComplete="off"
        />
        <Plane className="h-5 w-5 absolute left-3 top-3.5 text-muted-foreground" />
      </div>
      {showSuggestions && airlines.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg">
          {isSearching ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Searching airlines...</span>
            </div>
          ) : (
            <ul className="max-h-60 overflow-auto py-1">
              {airlines.map((airline) => (
                <li
                  key={airline.iata}
                  className="px-4 py-2 hover:bg-accent cursor-pointer text-left"
                  onClick={() => handleSelect(airline)}
                >
                  {airline.name} ({airline.iata})
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
