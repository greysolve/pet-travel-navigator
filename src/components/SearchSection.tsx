
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AirlinePolicySearch } from "./search/AirlinePolicySearch";
import { RouteSearch } from "./search/RouteSearch";
import { DateSelector } from "./search/DateSelector";
import { useFlightSearch } from "./search/FlightSearchHandler";
import type { SearchSectionProps } from "./search/types";
import { supabase } from "@/integrations/supabase/client";
import type { PetPolicy, FlightData } from "./flight-results/types";
import { useAuth } from "@/contexts/AuthContext";
import { usePetPolicies, useCountryPolicies } from "./flight-results/PolicyFetcher";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

type SavedSearch = {
  id: string;
  name: string | null;
  search_criteria: {
    type: 'airline' | 'route';
    airline_name?: string;
    origin?: string;
    destination?: string;
    departure_date?: string;
  };
  created_at: string;
}

export const SearchSection = ({ onSearchResults }: SearchSectionProps) => {
  const [policySearch, setPolicySearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState<Date>();
  const [destinationCountry, setDestinationCountry] = useState<string>();
  const [flights, setFlights] = useState<FlightData[]>([]);
  const [shouldSaveSearch, setShouldSaveSearch] = useState(false);
  const { toast } = useToast();
  const { handleFlightSearch, isLoading } = useFlightSearch();
  const { user } = useAuth();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  const loadSavedSearches = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error loading saved searches:", error);
      toast({
        title: "Error loading saved searches",
        description: "Could not load your saved searches. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Transform the data to match our SavedSearch type
    const transformedData: SavedSearch[] = data.map(item => ({
      id: item.id,
      name: item.name,
      search_criteria: item.search_criteria as SavedSearch['search_criteria'],
      created_at: item.created_at
    }));

    setSavedSearches(transformedData);
  };

  const handleLoadSearch = (searchCriteria: SavedSearch['search_criteria']) => {
    if (searchCriteria.type === 'airline') {
      setPolicySearch(searchCriteria.airline_name || "");
      setOrigin("");
      setDestination("");
      setDate(undefined);
    } else if (searchCriteria.type === 'route') {
      setPolicySearch("");
      setOrigin(searchCriteria.origin || "");
      setDestination(searchCriteria.destination || "");
      setDate(searchCriteria.departure_date ? new Date(searchCriteria.departure_date) : undefined);
    }
  };

  const handleSearch = async () => {
    if (policySearch && (origin || destination)) {
      toast({
        title: "Please choose one search method",
        description: "You can either search by airline policy or by route, but not both at the same time.",
        variant: "destructive",
      });
      return;
    }

    if (origin && destination && !date) {
      toast({
        title: "Please select a date",
        description: "A departure date is required to search for flights.",
        variant: "destructive",
      });
      return;
    }
    
    if (policySearch) {
      console.log("Searching for airline policy:", policySearch);
      const { data: airline, error: airlineError } = await supabase
        .from('airlines')
        .select('id')
        .eq('name', policySearch)
        .maybeSingle();

      if (airlineError || !airline?.id) {
        console.error("Error finding airline:", airlineError);
        toast({
          title: "Error finding airline",
          description: "Could not find the selected airline.",
          variant: "destructive",
        });
        return;
      }

      console.log("Found airline:", airline);
      const { data: petPolicy, error: policyError } = await supabase
        .from('pet_policies')
        .select('*')
        .eq('airline_id', airline.id)
        .maybeSingle();

      if (policyError) {
        console.error("Error fetching pet policy:", policyError);
        toast({
          title: "Error fetching pet policy",
          description: "Could not fetch the pet policy for the selected airline.",
          variant: "destructive",
        });
        return;
      }

      console.log("Found pet policy:", petPolicy);
      const results: FlightData[] = [];
      onSearchResults(results, { [policySearch]: petPolicy as PetPolicy });
      setFlights(results);

      if (shouldSaveSearch && user) {
        const { error: saveError } = await supabase
          .from('saved_searches')
          .insert({
            user_id: user.id,
            search_criteria: {
              type: 'airline',
              airline_name: policySearch
            }
          });

        if (saveError) {
          console.error("Error saving search:", saveError);
          toast({
            title: "Error saving search",
            description: "Could not save your search. Please try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Search saved",
            description: "Your search has been saved successfully.",
          });
          loadSavedSearches();
        }
      }
    } else if (origin && destination && date) {
      handleFlightSearch({
        origin,
        destination,
        date,
        destinationCountry,
        onSearchResults: async (results, policies) => {
          onSearchResults(results, policies);
          setFlights(results);

          if (shouldSaveSearch && user) {
            const { error: saveError } = await supabase
              .from('saved_searches')
              .insert({
                user_id: user.id,
                search_criteria: {
                  type: 'route',
                  origin,
                  destination,
                  departure_date: date.toISOString()
                }
              });

            if (saveError) {
              console.error("Error saving search:", saveError);
              toast({
                title: "Error saving search",
                description: "Could not save your search. Please try again.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Search saved",
                description: "Your search has been saved successfully.",
              });
              loadSavedSearches();
            }
          }
        },
        onSearchComplete: () => {}
      });
    }
  };

  const { data: flightPetPolicies } = usePetPolicies(flights);
  const { data: countryPolicies } = useCountryPolicies(
    Array.from(flights.reduce((countries: Set<string>, journey) => {
      journey.segments?.forEach(segment => {
        if (segment.departureCountry) countries.add(segment.departureCountry);
        if (segment.arrivalCountry) countries.add(segment.arrivalCountry);
      });
      return countries;
    }, new Set<string>()))
  );

  return (
    <div className="max-w-3xl mx-auto px-4 -mt-8">
      <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6 space-y-4">
        {user && (
          <div className="flex justify-end mb-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">My Searches</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[240px]">
                {savedSearches.length === 0 ? (
                  <DropdownMenuItem disabled>No saved searches</DropdownMenuItem>
                ) : (
                  savedSearches.map((search) => (
                    <DropdownMenuItem
                      key={search.id}
                      onClick={() => handleLoadSearch(search.search_criteria)}
                      className="flex flex-col items-start py-2"
                    >
                      <span className="font-medium">
                        {search.search_criteria.type === 'airline'
                          ? `Airline: ${search.search_criteria.airline_name}`
                          : `${search.search_criteria.origin} → ${search.search_criteria.destination}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(search.created_at), 'MMM d, yyyy')}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <AirlinePolicySearch 
          policySearch={policySearch}
          setPolicySearch={setPolicySearch}
        />
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white/80 px-2 text-muted-foreground">
              Or
            </span>
          </div>
        </div>

        <RouteSearch
          origin={origin}
          destination={destination}
          setOrigin={setOrigin}
          setDestination={setDestination}
          setDestinationCountry={setDestinationCountry}
        />

        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-full md:flex-1">
            <DateSelector date={date} setDate={setDate} />
          </div>
          {user && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="save-search"
                checked={shouldSaveSearch}
                onCheckedChange={(checked) => setShouldSaveSearch(checked as boolean)}
              />
              <Label
                htmlFor="save-search"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Save this search
              </Label>
            </div>
          )}
        </div>

        <Button 
          className="w-full h-12 mt-4 text-base bg-secondary hover:bg-secondary/90"
          onClick={handleSearch}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Searching...
            </>
          ) : (
            "Search"
          )}
        </Button>
      </div>
    </div>
  );
};
