
import { RouteSearch } from "../RouteSearch";
import { DateSelector } from "../DateSelector";
import { SaveSearch } from "../SaveSearch";
import { useFlightSearch } from "../FlightSearchHandler";
import { supabase } from "@/integrations/supabase/client";
import type { FlightData, PetPolicy } from "../../flight-results/types";
import type { ToastFunction } from "@/hooks/use-toast";

interface RouteSearchFormProps {
  origin: string;
  destination: string;
  setOrigin: (value: string) => void;
  setDestination: (value: string) => void;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  isLoading: boolean;
  policySearch: string;
  clearPolicySearch: () => void;
  shouldSaveSearch: boolean;
  setShouldSaveSearch: (value: boolean) => void;
  user: any;
  toast: ToastFunction;
  onSearchResults: (flights: FlightData[], policies?: Record<string, PetPolicy>) => void;
  setFlights: (flights: FlightData[]) => void;
}

export const RouteSearchForm = ({
  origin,
  destination,
  setOrigin,
  setDestination,
  date,
  setDate,
  isLoading,
  policySearch,
  clearPolicySearch,
  shouldSaveSearch,
  setShouldSaveSearch,
  user,
  toast,
  onSearchResults,
  setFlights
}: RouteSearchFormProps) => {
  const { handleFlightSearch } = useFlightSearch();

  return (
    <div className="space-y-4">
      <RouteSearch
        origin={origin}
        destination={destination}
        setOrigin={setOrigin}
        setDestination={setDestination}
        isLoading={isLoading}
        disabled={policySearch !== ""}
        onFocus={clearPolicySearch}
      />

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="w-full md:flex-1">
          <DateSelector 
            date={date} 
            setDate={setDate}
            isLoading={isLoading}
          />
        </div>
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
