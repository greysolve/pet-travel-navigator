
import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface Airport {
  iata_code: string;
  name: string;
  city: string;
  country: string;
  search_score?: number;
}

export interface RouteSearchProps {
  origin: string;
  destination: string;
  setOrigin: (value: string) => void;
  setDestination: (value: string) => void;
  date: Date | undefined;
  isLoading?: boolean;
  disabled?: boolean;
  onFocus?: () => void;
}

export const RouteSearch = ({
  origin,
  destination,
  setOrigin,
  setDestination,
  isLoading,
  disabled,
  onFocus
}: RouteSearchProps) => {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const { toast } = useToast();

  const fetchAirports = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setAirports([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // Split the search term by comma and get the first part (ignore country for now as we have scoring)
      const searchPart = searchTerm.split(',')[0].trim();
      
      console.log('Fetching airports with:', { searchPart });
      
      const { data, error } = await supabase
        .rpc('search_airports_insensitive', {
          search_term: searchPart
        });

      if (error) {
        console.error('Error fetching airports:', error);
        toast({
          title: "Error fetching airports",
          description: "Please try again",
          variant: "destructive",
        });
        return;
      }

      console.log('Airports search results:', data);
      setAirports(data as Airport[]);
    } catch (error) {
      console.error('Error fetching airports:', error);
      toast({
        title: "Error fetching airports",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  const formatAirportDisplay = (airport: Airport): string => {
    if (airport.search_score && airport.search_score >= 80) {
      // IATA code match - prioritize airport name
      return `${airport.name} (${airport.iata_code}), ${airport.city}, ${airport.country}`;
    } else {
      // City or other match - keep city first
      return `${airport.city}, ${airport.country} (${airport.iata_code})`;
    }
  };

  const handleInputFocus = () => {
    onFocus?.();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="relative">
        <Input
          type="text"
          placeholder="Origin (city or airport code)"
          className="h-12 text-base bg-white/90 border-0 shadow-sm"
          value={origin}
          onChange={(e) => {
            const value = e.target.value;
            setOrigin(value);
            fetchAirports(value);
            setShowOriginSuggestions(true);
          }}
          onFocus={() => {
            setShowOriginSuggestions(true);
            handleInputFocus();
          }}
          onBlur={() => {
            setTimeout(() => setShowOriginSuggestions(false), 200);
          }}
          disabled={isLoading || disabled}
        />
        {showOriginSuggestions && airports.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg">
            {isSearching ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <ul className="max-h-60 overflow-auto py-1">
                {airports.map((airport) => (
                  <li
                    key={airport.iata_code}
                    className="px-4 py-2 hover:bg-accent cursor-pointer text-left"
                    onClick={() => {
                      setOrigin(airport.iata_code);
                      setShowOriginSuggestions(false);
                    }}
                  >
                    {formatAirportDisplay(airport)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <Input
          type="text"
          placeholder="Destination (city or airport code)"
          className="h-12 text-base bg-white/90 border-0 shadow-sm"
          value={destination}
          onChange={(e) => {
            const value = e.target.value;
            setDestination(value);
            fetchAirports(value);
            setShowDestinationSuggestions(true);
          }}
          onFocus={() => {
            setShowDestinationSuggestions(true);
            handleInputFocus();
          }}
          onBlur={() => {
            setTimeout(() => setShowDestinationSuggestions(false), 200);
          }}
          disabled={isLoading || disabled}
        />
        {showDestinationSuggestions && airports.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg">
            {isSearching ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <ul className="max-h-60 overflow-auto py-1">
                {airports.map((airport) => (
                  <li
                    key={airport.iata_code}
                    className="px-4 py-2 hover:bg-accent cursor-pointer text-left"
                    onClick={() => {
                      setDestination(airport.iata_code);
                      setShowDestinationSuggestions(false);
                    }}
                  >
                    {formatAirportDisplay(airport)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
