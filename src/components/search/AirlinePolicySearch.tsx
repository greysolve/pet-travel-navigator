
import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface AirlinePolicySearchProps {
  policySearch: string;
  setPolicySearch: (value: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  onFocus?: () => void;
}

export const AirlinePolicySearch = ({
  policySearch,
  setPolicySearch,
  isLoading,
  disabled,
  onFocus
}: AirlinePolicySearchProps) => {
  const [airlines, setAirlines] = useState<Array<{iata: string, name: string}>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { toast } = useToast();

  const fetchAirlines = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setAirlines([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // Use a standard Supabase query instead of the RPC function
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

      // Transform data to match expected format
      const formattedData = data.map(airline => ({
        iata: airline.iata_code || '',
        name: airline.name
      }));

      console.log('Airline search results:', formattedData);
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

  const handleInputFocus = () => {
    onFocus?.();
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          type="text"
          placeholder="Airline name or code (e.g., American, AA)"
          className="h-12 text-base bg-white shadow-sm pl-10"
          value={policySearch}
          onChange={(e) => {
            const value = e.target.value;
            setPolicySearch(value);
            fetchAirlines(value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            setShowSuggestions(true);
            handleInputFocus();
          }}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          disabled={isLoading || disabled}
        />
        <Plane className="h-5 w-5 absolute left-3 top-3.5 text-muted-foreground" />
      </div>
      {showSuggestions && airlines.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white rounded-md shadow-lg">
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
                  onClick={() => {
                    setPolicySearch(airline.iata);
                    setShowSuggestions(false);
                  }}
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
