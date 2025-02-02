import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AirlinePolicySearch } from "./search/AirlinePolicySearch";
import { RouteSearch } from "./search/RouteSearch";
import { DateSelector } from "./search/DateSelector";

type FlightData = {
  carrierFsCode: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  arrivalCountry?: string;
  airlineName?: string;
};

export const SearchSection = ({ onSearchResults }: { onSearchResults: (flights: FlightData[]) => void }) => {
  const [policySearch, setPolicySearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState<Date>();
  const [isLoading, setIsLoading] = useState(false);
  const [destinationCountry, setDestinationCountry] = useState<string>();
  const { toast } = useToast();

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
    
    if (origin && destination && date) {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('search_flight_schedules', {
          body: { origin, destination, date: date.toISOString() }
        });

        if (error) throw error;

        console.log('Flight schedules:', data);
        
        if (data && data.scheduledFlights) {
          // Create a map of airline codes to names from the appendix
          const airlineMap = data.appendix?.airlines?.reduce((acc: Record<string, string>, airline: any) => {
            acc[airline.fs] = airline.name;
            return acc;
          }, {}) || {};

          const flights = data.scheduledFlights.map((flight: any) => ({
            carrierFsCode: flight.carrierFsCode,
            flightNumber: flight.flightNumber,
            departureTime: flight.departureTime,
            arrivalTime: flight.arrivalTime,
            arrivalCountry: destinationCountry,
            airlineName: airlineMap[flight.carrierFsCode],
          }));
          onSearchResults(flights);
        }

      } catch (error) {
        console.error('Error searching flights:', error);
        toast({
          title: "Error searching flights",
          description: "There was an error searching for flights. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
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