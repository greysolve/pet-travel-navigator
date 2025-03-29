
import { useAuth } from "@/contexts/auth/AuthContext";
import { usePetPolicies, useCountryPolicies } from "./flight-results/PolicyFetcher";
import { useFlightSearch } from "./search/hooks/useFlightSearch";
import { useSavedSearches } from "./search/hooks/useSavedSearches";
import { useFlightSearchState } from "./search/hooks/useFlightSearchState";
import { useSearchValidation } from "./search/hooks/useSearchValidation";
import { useSearchHandler } from "./search/hooks/useSearchHandler";
import { SearchFormContainer } from "./search/SearchFormContainer";
import { getSearchCountries } from "./search/search-utils/policyCalculations";
import { ApiProvider, DEFAULT_API_PROVIDER } from "@/config/feature-flags";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useUserSearchCount } from "./search/hooks/useUserSearchCount";
import { useUser } from "@/contexts/user/UserContext";
import type { SearchSectionProps } from "./search/types";

export const SearchSection = ({ onSearchResults }: SearchSectionProps) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, profileInitialized, lifecycleState } = useUser();
  const { isSearchLoading, handleFlightSearch } = useFlightSearch();
  const { searchCount, isLoading: searchCountLoading } = useUserSearchCount();
  const { savedSearches, handleDeleteSearch } = useSavedSearches(user?.id);
  const { validateSearch } = useSearchValidation();
  
  // Use app settings for API provider
  const { apiProvider = DEFAULT_API_PROVIDER, enableFallback = false } = useAppSettings();
  
  // Determine if user is a pet caddie (has a plan) or an admin
  const isPetCaddie = !!profile?.plan || profile?.userRole === 'site_manager';
  
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
    passengers,
    setPassengers,
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
    passengers,
    shouldSaveSearch,
    setFlights,
    handleFlightSearch,
    onSearchResults,
    apiProvider,
    enableFallback,
  });

  const isLoading = authLoading || isSearchLoading || searchCountLoading;

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
    setPassengers(searchCriteria.passengers || 1);
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

  console.log('SearchSection rendering:', { 
    lifecycleState, 
    profileInitialized, 
    isPetCaddie, 
    userRole: profile?.userRole 
  });

  return (
    <div>
      <SearchFormContainer
        user={user}
        isPetCaddie={isPetCaddie}
        searchCount={searchCount as number}
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
        passengers={passengers}
        setPassengers={setPassengers}
        toast={toast}
        onSearchResults={onSearchResults}
        setFlights={setFlights}
        onLoadSearch={handleLoadSearch}
        handleDeleteSearch={handleDeleteSearch}
        handleSearch={handleSearch}
        onPolicySearch={handlePolicySearch}
        apiProvider={apiProvider}
        enableFallback={enableFallback}
        profileInitialized={profileInitialized}
      />
    </div>
  );
};
