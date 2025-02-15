
import { supabase } from "@/integrations/supabase/client";
import { useSingleAirlinePolicy } from "../../flight-results/PolicyFetcher";
import type { PetPolicy } from "../../flight-results/types";
import { AirlinePolicySearch } from "../AirlinePolicySearch";
import { SaveSearch } from "../SaveSearch";
import type { ToastFunction } from "@/hooks/use-toast";

interface PolicySearchFormProps {
  policySearch: string;
  setPolicySearch: (value: string) => void;
  isLoading: boolean;
  hasRouteSearch: boolean;
  clearRouteSearch: () => void;
  shouldSaveSearch: boolean;
  setShouldSaveSearch: (value: boolean) => void;
  user: any;
  toast: ToastFunction;
  onSearchResults: (flights: any[], policies?: Record<string, PetPolicy>) => void;
  setFlights: (flights: any[]) => void;
  onPolicySearch: () => Promise<void>;
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
  setFlights,
  onPolicySearch
}: PolicySearchFormProps) => {
  const { data: policy, isLoading: isPolicyLoading } = useSingleAirlinePolicy(policySearch);

  const handlePolicySearch = async () => {
    if (!policy) {
      console.error("No policy found for airline:", policySearch);
      toast({
        title: "Error finding airline",
        description: "Could not find the selected airline's pet policy.",
        variant: "destructive",
      });
      return;
    }

    console.log("Found pet policy:", policy);
    const results: any[] = [];
    onSearchResults(results, { [policySearch]: policy });
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
        isLoading={isLoading || isPolicyLoading}
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

