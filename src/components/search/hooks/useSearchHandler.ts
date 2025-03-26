import { supabase } from "@/integrations/supabase/client";
import type { FlightData, PetPolicy } from "../../flight-results/types";
import type { ToastFunction } from "@/hooks/use-toast";

interface SearchHandlerProps {
  user: any;
  toast: ToastFunction;
  policySearch: string;
  origin: string;
  destination: string;
  date: Date | undefined;
  shouldSaveSearch: boolean;
  setFlights: (flights: FlightData[]) => void;
  handleFlightSearch: (
    origin: string, 
    destination: string, 
    date: Date, 
    onResults: (results: FlightData[], policies?: Record<string, PetPolicy>) => void,
    onComplete?: () => void
  ) => Promise<FlightData[]>;
  onSearchResults: (flights: FlightData[], policies?: Record<string, PetPolicy>) => void;
}

export const useSearchHandler = ({
  user,
  toast,
  policySearch,
  origin,
  destination,
  date,
  shouldSaveSearch,
  setFlights,
  handleFlightSearch,
  onSearchResults,
}: SearchHandlerProps) => {
  const handlePolicySearch = async () => {
    if (!user) return;

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
  };

  const handleRouteSearch = async () => {
    if (!user) return;
    if (!date) {
      toast({
        title: "Date required",
        description: "Please select a date for your travel",
        variant: "destructive",
      });
      return;
    }

    console.log('Handling route search with:', { origin, destination, date });
    try {
      // Call the handleFlightSearch function to get flight data
      const flightResults = await handleFlightSearch(
        origin,
        destination,
        date,
        async (results: FlightData[], policies?: Record<string, PetPolicy>) => {
          console.log("Search results callback received:", { results, policies });
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
        () => {
          console.log("Search completed");
        }
      );
      
      // Ensure flightResults is properly processed before returning
      console.log("Final flight results from handleRouteSearch:", flightResults);
      return flightResults;
    } catch (error) {
      console.error("Error in handleRouteSearch:", error);
      toast({
        title: "Search failed",
        description: "There was an error performing your search. Please try again.",
        variant: "destructive",
      });
      return [];
    }
  };

  return {
    handlePolicySearch,
    handleRouteSearch
  };
};
