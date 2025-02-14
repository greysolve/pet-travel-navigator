
import { supabase } from "@/integrations/supabase/client";
import type { PetPolicy } from "../../flight-results/types";
import { AirlinePolicySearch } from "../AirlinePolicySearch";
import { SaveSearch } from "../SaveSearch";
import type { Toast } from "@/hooks/use-toast";

interface PolicySearchFormProps {
  policySearch: string;
  setPolicySearch: (value: string) => void;
  isLoading: boolean;
  hasRouteSearch: boolean;
  clearRouteSearch: () => void;
  shouldSaveSearch: boolean;
  setShouldSaveSearch: (value: boolean) => void;
  user: any;
  toast: Toast;
  onSearchResults: (flights: any[], policies?: Record<string, PetPolicy>) => void;
  setFlights: (flights: any[]) => void;
}

export const PolicySearchForm = ({
  policySearch,
  setPolicySearch,
  isLoading,
  hasRouteSearch,
  clearRouteSearch,
  shouldSaveSearch,
  setShouldSaveSearch,
  user,
  toast,
  onSearchResults,
  setFlights
}: PolicySearchFormProps) => {
  const handlePolicySearch = async () => {
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
    const results: any[] = [];
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
  };

  return (
    <div className="space-y-4">
      <AirlinePolicySearch 
        policySearch={policySearch}
        setPolicySearch={setPolicySearch}
        isLoading={isLoading}
        disabled={hasRouteSearch}
        onFocus={clearRouteSearch}
      />
      
      <div className="flex justify-end">
        <SaveSearch
          shouldSaveSearch={shouldSaveSearch}
          setShouldSaveSearch={setShouldSaveSearch}
          user={user}
          isProfileLoading={isLoading}
        />
      </div>
    </div>
  );
};
