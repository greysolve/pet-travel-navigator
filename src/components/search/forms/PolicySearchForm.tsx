
import { supabase } from "@/integrations/supabase/client";
import { useSingleAirlinePolicy } from "../../flight-results/PolicyFetcher";
import type { PetPolicy } from "../../flight-results/types";
import { AirlinePolicySearch } from "../AirlinePolicySearch";
import type { ToastFunction } from "@/hooks/use-toast";
import { useState } from "react";

interface PolicySearchFormProps {
  policySearch: string; // this is now the IATA code selected (or blank)
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
  onPolicySearch,
}: PolicySearchFormProps) => {
  const [displayValue, setDisplayValue] = useState("");
  // Only fetch if we have a valid IATA code (never for free text)
  const validIATA = typeof policySearch === "string" && policySearch.length === 2 || policySearch.length === 3;
  const { data: policy, isLoading: isPolicyLoading } = useSingleAirlinePolicy(validIATA ? policySearch : "");

  return (
    <div className="space-y-4">
      <AirlinePolicySearch
        policySearch={policySearch}
        setPolicySearch={setPolicySearch}
        setPolicySearchDisplay={setDisplayValue}
        isLoading={isLoading}
        disabled={hasRouteSearch}
        onFocus={clearRouteSearch}
      />
    </div>
  );
};
