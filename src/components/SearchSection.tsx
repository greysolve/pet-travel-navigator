import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { AirlinePolicySearch } from "./search/AirlinePolicySearch";
import { RouteSearch } from "./search/RouteSearch";
import { DateSelector } from "./search/DateSelector";
import { useFlightSearch } from "./search/FlightSearchHandler";
import { SearchFormHeader } from "./search/SearchFormHeader";
import { SearchButton } from "./search/SearchButton";
import { useSavedSearches } from "./search/hooks/useSavedSearches";
import type { SearchSectionProps, SavedSearch } from "./search/types";
import { supabase } from "@/integrations/supabase/client";
import type { PetPolicy, FlightData } from "./flight-results/types";
import { useAuth } from "@/contexts/AuthContext";
import { usePetPolicies, useCountryPolicies } from "./flight-results/PolicyFetcher";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const SearchSection = ({ onSearchResults }: SearchSectionProps) => {
  const [policySearch, setPolicySearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState<Date>();
  const [flights, setFlights] = useState<FlightData[]>([]);
  const [shouldSaveSearch, setShouldSaveSearch] = useState(false);
  const { toast } = useToast();
  const { handleFlightSearch, isLoading, searchCount, isPetCaddie, isProfileLoading } = useFlightSearch();
  const { user } = useAuth();
  const { savedSearches, handleDeleteSearch } = useSavedSearches(user?.id);

  useEffect(() => {
    console.log('Auth state changed, resetting form state');
    setPolicySearch("");
    setOrigin("");
    setDestination("");
    setDate(undefined);
    setFlights([]);
    setShouldSaveSearch(false);
  }, [user?.id]);

  const handleLoadSearch = (searchCriteria: SavedSearch['search_criteria']) => {
    console.log('Loading saved search:', searchCriteria);
    setOrigin(searchCriteria.origin);
    setDestination(searchCriteria.destination);
    setDate(searchCriteria.date ? new Date(searchCriteria.date) : undefined);
    setPolicySearch(""); // Clear any airline policy search when loading a route search
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
              policySearch
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
        }
      }
    } else if (origin && destination && date) {
      handleFlightSearch({
        origin,
        destination,
        date,
        onSearchResults: async (results, policies) => {
          onSearchResults(results, policies);
          setFlights(results);

          if (shouldSaveSearch && user) {
            const { error: saveError } = await supabase
              .from('saved_searches')
              .insert({
                user_id: user.id,
                search_criteria: {
                  origin,
                  destination,
                  date: date.toISOString()
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
        <SearchFormHeader
          user={user}
          isPetCaddie={isPetCaddie}
          searchCount={searchCount}
          savedSearches={savedSearches}
          onLoadSearch={handleLoadSearch}
          onDeleteSearch={(e, id) => {
            e.stopPropagation();
            handleDeleteSearch(id);
          }}
        />

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

        <SearchButton
          isLoading={isLoading}
          isProfileLoading={isProfileLoading}
          onClick={handleSearch}
        />
      </div>
    </div>
  );
};
