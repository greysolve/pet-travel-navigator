
import { RouteSearch } from "../RouteSearch";
import { DateSelector } from "../DateSelector";
import { SaveSearch } from "../SaveSearch";
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
  user
}: RouteSearchFormProps) => {
  return (
    <div className="space-y-6">
      <div>
        <RouteSearch
          origin={origin}
          destination={destination}
          setOrigin={setOrigin}
          setDestination={setDestination}
          date={date}
          isLoading={isLoading}
          disabled={policySearch !== ""}
          onFocus={clearPolicySearch}
        />
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="w-full md:w-2/3">
          <DateSelector 
            date={date} 
            setDate={setDate}
            isLoading={isLoading}
          />
        </div>
        <div className="w-full md:w-1/3">
          <SaveSearch
            shouldSaveSearch={shouldSaveSearch}
            setShouldSaveSearch={setShouldSaveSearch}
            user={user}
            isProfileLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};
