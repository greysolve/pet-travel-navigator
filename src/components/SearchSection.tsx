import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AirlinePolicySearch } from "./search/AirlinePolicySearch";
import { RouteSearch } from "./search/RouteSearch";
import { DateSelector } from "./search/DateSelector";
import { SavedSearchesManager } from "./search/SavedSearchesManager";
import { useFlightSearch } from "./search/FlightSearchHandler";
import type { SearchSectionProps } from "./search/types";
import { supabase } from "@/integrations/supabase/client";
import type { PetPolicy, FlightData } from "./flight-results/types";
import { useAuth } from "@/contexts/AuthContext";
import { usePetPolicies, useCountryPolicies } from "./flight-results/PolicyFetcher";

export const SearchSection = ({ onSearchResults }: SearchSectionProps) => {
  const [policySearch, setPolicySearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState<Date>();
  const [destinationCountry, setDestinationCountry] = useState<string>();
  const [flights, setFlights] = useState<FlightData[]>([]);
  const { toast } = useToast();
  const { handleFlightSearch, isLoading } = useFlightSearch();
  const { user } = useAuth();

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
    } else if (origin && destination && date) {
      handleFlightSearch({
        origin,
        destination,
        date,
        destinationCountry,
        onSearchResults: (results, policies) => {
          onSearchResults(results, policies);
          setFlights(results);
        },
        onSearchComplete: () => {}
      });
    }
  };

  const handleLoadSavedSearch = (searchCriteria: any) => {
    if (searchCriteria.policySearch) {
      setPolicySearch(searchCriteria.policySearch);
    } else {
      setPolicySearch("");
    }
    
    if (searchCriteria.origin) {
      setOrigin(searchCriteria.origin);
    }
    
    if (searchCriteria.destination) {
      setDestination(searchCriteria.destination);
    }
    
    if (searchCriteria.date) {
      setDate(new Date(searchCriteria.date));
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
          <SavedSearchesManager
            currentSearch={{ origin, destination, date, policySearch }}
            flights={flights}
            petPolicies={flightPetPolicies}
            countryPolicies={countryPolicies}
            onLoadSearch={handleLoadSavedSearch}
          />
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

        <DateSelector date={date} setDate={setDate} />

        <Button 
          className="w-full h-12 mt-4 text-base bg-secondary hover:bg-secondary/90"
          onClick={handleSearch}
          disabled={isLoading}
        >
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>
    </div>
  );
};
