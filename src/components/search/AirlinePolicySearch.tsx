
import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Airline = {
  name: string;
  iata_code: string | null;
};

interface AirlinePolicySearchProps {
  policySearch: string;
  setPolicySearch: (value: string) => void;
}

export const AirlinePolicySearch = ({ policySearch, setPolicySearch }: AirlinePolicySearchProps) => {
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAirlineSuggestions, setShowAirlineSuggestions] = useState(false);
  const { toast } = useToast();

  const fetchAirlines = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setAirlines([]);
      return;
    }

    setIsSearching(true);
    try {
      console.log('Fetching airlines for search term:', searchTerm);
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

      console.log('Fetched airlines:', data);
      setAirlines(data || []);
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

  // Effect to validate and fetch airline data when policySearch is set externally
  useEffect(() => {
    if (policySearch && !airlines.some(airline => airline.name === policySearch)) {
      fetchAirlines(policySearch);
    }
  }, [policySearch, fetchAirlines]);

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder="Search for airline pet policies..."
        className="h-12 text-lg bg-white/90 border-0 shadow-sm"
        value={policySearch}
        onChange={(e) => {
          const value = e.target.value;
          setPolicySearch(value);
          fetchAirlines(value);
          setShowAirlineSuggestions(true);
        }}
        onFocus={() => {
          setShowAirlineSuggestions(true);
          if (policySearch) {
            fetchAirlines(policySearch);
          }
        }}
      />
      {showAirlineSuggestions && airlines.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg">
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
                  onClick={() => {
                    setPolicySearch(airline.name);
                    setShowAirlineSuggestions(false);
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
