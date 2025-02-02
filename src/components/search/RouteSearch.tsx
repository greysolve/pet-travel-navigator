import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Airport = {
  iata_code: string;
  name: string;
  city: string;
  country: string;
};

interface RouteSearchProps {
  origin: string;
  destination: string;
  setOrigin: (value: string) => void;
  setDestination: (value: string) => void;
  setDestinationCountry: (value: string) => void;
}

export const RouteSearch = ({
  origin,
  destination,
  setOrigin,
  setDestination,
  setDestinationCountry,
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
      // Clean the search term by removing commas and extra spaces
      const cleanSearchTerm = searchTerm.replace(/,/g, '').trim();
      
      console.log('Fetching airports for search term:', cleanSearchTerm);
      const { data, error } = await supabase
        .from('airports')
        .select('iata_code, name, city, country')
        .or(`iata_code.ilike.%${cleanSearchTerm}%,city.ilike.%${cleanSearchTerm}%`)
        .not('name', 'ilike', '%railway%')
        .not('name', 'ilike', '%station%')
        .limit(10);

      if (error) {
        console.error('Error fetching airports:', error);
        toast({
          title: "Error fetching airports",
          description: "Please try again",
          variant: "destructive",
        });
        return;
      }

      console.log('Fetched airports:', data);
      setAirports(data || []);
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
          onFocus={() => setShowOriginSuggestions(true)}
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
                    className="px-4 py-2 hover:bg-accent cursor-pointer"
                    onClick={() => {
                      setOrigin(airport.iata_code);
                      setShowOriginSuggestions(false);
                    }}
                  >
                    {airport.city} ({airport.iata_code})
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
          onFocus={() => setShowDestinationSuggestions(true)}
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
                    className="px-4 py-2 hover:bg-accent cursor-pointer"
                    onClick={() => {
                      setDestination(airport.iata_code);
                      setDestinationCountry(airport.country);
                      setShowDestinationSuggestions(false);
                    }}
                  >
                    {airport.city} ({airport.iata_code})
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