
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { usePetPolicies, useCountryPolicies } from "./flight-results/PolicyFetcher";
import { useFlightSearch } from "./search/FlightSearchHandler";
import { useSavedSearches } from "./search/hooks/useSavedSearches";
import { useFlightSearchState } from "./search/hooks/useFlightSearchState";
import { useSearchValidation } from "./search/hooks/useSearchValidation";
import { SearchFormHeader } from "./search/SearchFormHeader";
import { SearchDivider } from "./search/SearchDivider";
import { SearchButton } from "./search/SearchButton";
import { PolicySearchForm } from "./search/forms/PolicySearchForm";
import { RouteSearchForm } from "./search/forms/RouteSearchForm";
import { getSearchCountries } from "./search/search-utils/policyCalculations";
import type { SearchSectionProps } from "./search/types";

export const SearchSection = ({ onSearchResults }: SearchSectionProps) => {
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading, initialized } = useProfile();
  const { isSearchLoading, searchCount, isPetCaddie } = useFlightSearch();
  const { savedSearches, handleDeleteSearch } = useSavedSearches(user?.id);
  const { validateSearch } = useSearchValidation();
  const {
    policySearch,
    setPolicySearch,
    origin,
    setOrigin,
    destination,
    setDestination,
    date,
    setDate,
    flights,
    setFlights,
    shouldSaveSearch,
    setShouldSaveSearch,
    clearRouteSearch,
    clearPolicySearch,
    toast
  } = useFlightSearchState(user?.id);

  const isLoading = authLoading || profileLoading || !initialized || isSearchLoading;

  const handleLoadSearch = (searchCriteria: any) => {
    console.log('Loading saved search:', searchCriteria);
    setOrigin(searchCriteria.origin || "");
    setDestination(searchCriteria.destination || "");
    setDate(searchCriteria.date ? new Date(searchCriteria.date) : undefined);
    setPolicySearch(""); // Clear any airline policy search when loading a route search
  };

  const handleSearch = async () => {
    if (!validateSearch(policySearch, origin, destination, date)) {
      return;
    }
    
    if (policySearch) {
      const policySearchFormRef = document.querySelector('[data-policy-search-form]');
      if (policySearchFormRef) {
        await handlePolicySearch();
      }
    } else if (origin && destination && date) {
      await handleRouteSearch();
    }
  };

  const handlePolicySearch = async () => {
    // Get reference to the PolicySearchForm component
    const policySearchRef = document.querySelector('[data-policy-search-form]');
    if (policySearchRef) {
      await (policySearchRef as any).handlePolicySearch();
    }
  };

  const handleRouteSearch = async () => {
    const routeSearchRef = document.querySelector('[data-route-search-form]');
    if (routeSearchRef) {
      await (routeSearchRef as any).handleRouteSearch();
    }
  };

  const { data: flightPetPolicies } = usePetPolicies(flights);
  const { data: countryPolicies } = useCountryPolicies(getSearchCountries(flights));

  const hasRouteSearch = origin !== "" || destination !== "";

  return (
    <div className="max-w-3xl mx-auto px-4 -mt-8">
      <div className={cn(
        "bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6 space-y-4",
        isLoading && "opacity-75"
      )}>
        <SearchFormHeader
          user={user}
          isPetCaddie={isPetCaddie}
          searchCount={searchCount}
          savedSearches={savedSearches}
          onLoadSearch={handleLoadSearch}
          onDeleteSearch={(e, id) => {
            e.stopPropagation();
            handleDeleteSearch(id);
          }}
          isLoading={isLoading}
        />

        <PolicySearchForm 
          policySearch={policySearch}
          setPolicySearch={setPolicySearch}
          isLoading={isLoading}
          hasRouteSearch={hasRouteSearch}
          clearRouteSearch={clearRouteSearch}
          shouldSaveSearch={shouldSaveSearch}
          setShouldSaveSearch={setShouldSaveSearch}
          user={user}
          toast={toast}
          onSearchResults={onSearchResults}
          setFlights={setFlights}
          onPolicySearch={handlePolicySearch}
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
          isProfileLoading={isLoading}
          onClick={handleSearch}
        />
      </div>
    </div>
  );
};
