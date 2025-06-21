
import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plane } from "lucide-react";
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
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col">
          <label className="text-lg font-semibold text-[#1a365d] mb-2 font-serif flex items-center gap-2">
            🛫 From
          </label>
          <div className="relative">
            <div className="relative">
              <Input
                type="text"
                placeholder="Origin city or airport code"
                className="text-lg py-4 px-4 pl-12 border-2 border-[#e2e8f0] rounded-lg bg-white focus:border-[#d4af37] focus:ring-3 focus:ring-[rgba(212,175,55,0.2)] transition-all duration-300"
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
              <Plane className="h-5 w-5 absolute left-3 top-3.5 text-muted-foreground" />
            </div>
            {showOriginSuggestions && airports.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white rounded-md shadow-lg">
                {isSearching ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Searching airports...</span>
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
        </div>

        <div className="flex flex-col">
          <label className="text-lg font-semibold text-[#1a365d] mb-2 font-serif flex items-center gap-2">
            🛬 To
          </label>
          <div className="relative">
            <div className="relative">
              <Input
                type="text"
                placeholder="Destination city or airport code"
                className="text-lg py-4 px-4 pl-12 border-2 border-[#e2e8f0] rounded-lg bg-white focus:border-[#d4af37] focus:ring-3 focus:ring-[rgba(212,175,55,0.2)] transition-all duration-300"
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
              <Plane className="h-5 w-5 absolute left-3 top-3.5 text-muted-foreground rotate-90" />
            </div>
            {showDestinationSuggestions && airports.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white rounded-md shadow-lg">
                {isSearching ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Searching airports...</span>
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
      </div>
    </div>
  );
};
