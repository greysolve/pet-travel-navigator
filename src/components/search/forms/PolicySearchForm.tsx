
import { supabase } from "@/integrations/supabase/client";
import { useSingleAirlinePolicy } from "../../flight-results/PolicyFetcher";
import type { PetPolicy } from "../../flight-results/types";
import { AirlinePolicySearch } from "../AirlinePolicySearch";
import type { ToastFunction } from "@/hooks/use-toast";

interface PolicySearchFormProps {
  policySearch: string;
  setPolicySearch: (value: string) => void;
  isLoading: boolean;
  hasRouteSearch: boolean;
  clearRouteSearch: () => void;
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
  user,
  toast,
  onSearchResults,
  setFlights,
  onPolicySearch
}: PolicySearchFormProps) => {
  // Only fetch policy when needed, not during typing
  const { data: policy, isLoading: isPolicyLoading } = useSingleAirlinePolicy(policySearch);

  return (
    <div className="space-y-4">
      <AirlinePolicySearch 
        policySearch={policySearch}
        setPolicySearch={setPolicySearch}
        // Only pass input-specific loading state, not policy loading
        isLoading={isLoading}
        disabled={hasRouteSearch}
        onFocus={clearRouteSearch}
      />
    </div>
  );
};
