import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AirlinePolicySearch } from "./search/AirlinePolicySearch";
import { RouteSearch } from "./search/RouteSearch";
import { DateSelector } from "./search/DateSelector";
import { useFlightSearch } from "./search/FlightSearchHandler";
import type { SearchSectionProps } from "./search/types";
import { supabase } from "@/integrations/supabase/client";

export const SearchSection = ({ onSearchResults }: SearchSectionProps) => {
  const [policySearch, setPolicySearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState<Date>();
  const [destinationCountry, setDestinationCountry] = useState<string>();
  const { toast } = useToast();
  const { handleFlightSearch, isLoading } = useFlightSearch();

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
      const { data: airlines, error: airlineError } = await supabase
        .from('airlines')
        .select('id, iata_code')
        .eq('name', policySearch)
        .single();

      if (airlineError) {
        console.error("Error finding airline:", airlineError);
        toast({
          title: "Error finding airline",
          description: "Could not find the selected airline.",
          variant: "destructive",
        });
        return;
      }

      console.log("Found airline:", airlines);
      const { data: flights } = await supabase.rpc('get_airline_flights', {
        airline_iata: airlines.iata_code
      });

      console.log("Found flights:", flights);
      onSearchResults(flights || []);
    } else if (origin && destination && date) {
      handleFlightSearch({
        origin,
        destination,
        date,
        destinationCountry,
        onSearchResults,
        onSearchComplete: () => {}
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 -mt-8">
      <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6 space-y-4">
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