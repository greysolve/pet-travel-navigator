import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { usePetPolicies, useCountryPolicies } from "./flight-results/PolicyFetcher";
import { useFlightSearch } from "./search/hooks/useFlightSearch";
import { useSavedSearches } from "./search/hooks/useSavedSearches";
import { useFlightSearchState } from "./search/hooks/useFlightSearchState";
import { useSearchValidation } from "./search/hooks/useSearchValidation";
import { useSearchHandler } from "./search/hooks/useSearchHandler";
import { SearchFormContainer } from "./search/SearchFormContainer";
import { getSearchCountries } from "./search/search-utils/policyCalculations";
import { ApiProviderSelector } from "./search/ApiProviderSelector";
import { useState } from "react";
import { ApiProvider, DEFAULT_API_PROVIDER } from "@/config/feature-flags";
import type { SearchSectionProps } from "./search/types";

export const SearchSection = ({ onSearchResults }: SearchSectionProps) => {
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading, initialized } = useProfile();
  const { isSearchLoading, searchCount, isPetCaddie, handleFlightSearch } = useFlightSearch();
  const { savedSearches, handleDeleteSearch } = useSavedSearches(user?.id);
  const { validateSearch } = useSearchValidation();
  const [apiProvider, setApiProvider] = useState<ApiProvider>(DEFAULT_API_PROVIDER);
  
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

  const { handlePolicySearch, handleRouteSearch } = useSearchHandler({
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
    apiProvider,
  });

  const isLoading = authLoading || profileLoading || !initialized || isSearchLoading;

  const handleLoadSearch = (searchCriteria: any) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to load saved searches",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Loading saved search:', searchCriteria);
    setOrigin(searchCriteria.origin || "");
    setDestination(searchCriteria.destination || "");
    setDate(searchCriteria.date ? new Date(searchCriteria.date) : undefined);
    setPolicySearch(""); // Clear any airline policy search when loading a route search
  };

  const handleSearch = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search",
        variant: "destructive",
      });
      return;
    }

    if (!validateSearch(policySearch, origin, destination, date)) {
      return;
    }
    
    if (policySearch) {
      await handlePolicySearch();
    } else if (origin && destination && date) {
      await handleRouteSearch();
    }
  };

  const hasRouteSearch = origin !== "" || destination !== "";

  const { data: flightPetPolicies } = usePetPolicies(flights);
  const { data: countryPolicies } = useCountryPolicies(getSearchCountries(flights));

  return (
    <div>
      <ApiProviderSelector 
        apiProvider={apiProvider}
        onChange={setApiProvider}
        disabled={isLoading}
      />
      <SearchFormContainer
        user={user}
        isPetCaddie={isPetCaddie}
        searchCount={searchCount}
        savedSearches={savedSearches}
        isLoading={isLoading}
        policySearch={policySearch}
        setPolicySearch={setPolicySearch}
        hasRouteSearch={hasRouteSearch}
        clearRouteSearch={clearRouteSearch}
        origin={origin}
        destination={destination}
        setOrigin={setOrigin}
        setDestination={setDestination}
        date={date}
        setDate={setDate}
        clearPolicySearch={clearPolicySearch}
        shouldSaveSearch={shouldSaveSearch}
        setShouldSaveSearch={setShouldSaveSearch}
        toast={toast}
        onSearchResults={onSearchResults}
        setFlights={setFlights}
        onLoadSearch={handleLoadSearch}
        handleDeleteSearch={handleDeleteSearch}
        handleSearch={handleSearch}
        onPolicySearch={handlePolicySearch}
      />
    </div>
  );
};
