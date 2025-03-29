
import { cn } from "@/lib/utils";
import { SearchFormHeader } from "./SearchFormHeader";
import { PolicySearchForm } from "./forms/PolicySearchForm";
import { RouteSearchForm } from "./forms/RouteSearchForm";
import { SearchButton } from "./SearchButton";
import { SearchDivider } from "./SearchDivider";
import { ApiProvider } from "@/config/feature-flags";
import type { SavedSearch } from "./types";
import type { FlightData, PetPolicy } from "../flight-results/types";
import type { ToastFunction } from "@/hooks/use-toast";

interface SearchFormContainerProps {
  user: any;
  isPetCaddie: boolean;
  searchCount: number | undefined;
  savedSearches: SavedSearch[];
  isLoading: boolean;
  policySearch: string;
  setPolicySearch: (value: string) => void;
  hasRouteSearch: boolean;
  clearRouteSearch: () => void;
  origin: string;
  destination: string;
  setOrigin: (value: string) => void;
  setDestination: (value: string) => void;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  clearPolicySearch: () => void;
  shouldSaveSearch: boolean;
  setShouldSaveSearch: (value: boolean) => void;
  passengers: number;
  setPassengers: (value: number) => void;
  toast: ToastFunction;
  onSearchResults: (flights: FlightData[], policies?: Record<string, PetPolicy>, provider?: string, apiError?: string) => void;
  setFlights: (flights: FlightData[]) => void;
  onLoadSearch: (searchCriteria: SavedSearch['search_criteria']) => void;
  handleDeleteSearch: (id: string) => void;
  handleSearch: () => void;
  onPolicySearch: () => Promise<void>;
  apiProvider?: ApiProvider;
  enableFallback?: boolean;
  profileInitialized: boolean;
}

export const SearchFormContainer = ({
  user,
  isPetCaddie,
  searchCount,
  savedSearches,
  isLoading,
  policySearch,
  setPolicySearch,
  hasRouteSearch,
  clearRouteSearch,
  origin,
  destination,
  setOrigin,
  setDestination,
  date,
  setDate,
  clearPolicySearch,
  shouldSaveSearch,
  setShouldSaveSearch,
  passengers,
  setPassengers,
  toast,
  onSearchResults,
  setFlights,
  onLoadSearch,
  handleDeleteSearch,
  handleSearch,
  onPolicySearch,
  apiProvider,
  enableFallback,
  profileInitialized
}: SearchFormContainerProps) => {
  return (
    <div className="relative max-w-3xl mx-auto px-4 -mt-28 z-10">
      <div className={cn(
        "bg-white shadow-xl rounded-xl p-6 space-y-6",
        isLoading && "opacity-75"
      )}>
        <SearchFormHeader
          user={user}
          isPetCaddie={isPetCaddie}
          searchCount={searchCount}
          savedSearches={savedSearches}
          passengers={passengers}
          setPassengers={setPassengers}
          onLoadSearch={onLoadSearch}
          onDeleteSearch={(e, id) => {
            e.stopPropagation();
            handleDeleteSearch(id);
          }}
          isLoading={isLoading}
          profileInitialized={profileInitialized}
        />

        <PolicySearchForm 
          policySearch={policySearch}
          setPolicySearch={setPolicySearch}
          isLoading={isLoading}
          hasRouteSearch={hasRouteSearch}
          clearRouteSearch={clearRouteSearch}
          user={user}
          toast={toast}
          onSearchResults={onSearchResults}
          setFlights={setFlights}
          onPolicySearch={onPolicySearch}
        />
        
        <SearchDivider />

        <RouteSearchForm
          origin={origin}
          destination={destination}
          setOrigin={setOrigin}
          setDestination={setDestination}
          date={date}
          setDate={setDate}
          isLoading={isLoading}
          policySearch={policySearch}
          clearPolicySearch={clearPolicySearch}
          shouldSaveSearch={shouldSaveSearch}
          setShouldSaveSearch={setShouldSaveSearch}
          user={user}
          toast={toast}
          onSearchResults={onSearchResults}
          setFlights={setFlights}
        />

        <SearchButton
          isLoading={isLoading}
          onClick={handleSearch}
        />
      </div>
    </div>
  );
};
