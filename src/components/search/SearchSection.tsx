
import { useState } from "react";
import { useUser } from "@/contexts/user/UserContext";
import { usePetPolicies } from "../flight-results/PolicyFetcher";
import { useFlightSearch } from "./hooks/useFlightSearch";
import { useSavedSearches } from "./hooks/useSavedSearches";
import { useFlightSearchState } from "./hooks/useFlightSearchState";
import { useSearchValidation } from "./hooks/useSearchValidation";
import { useSearchHandler } from "./hooks/useSearchHandler";
import { SearchFormContainer } from "./SearchFormContainer";
import { ApiProvider, DEFAULT_API_PROVIDER } from "@/config/feature-flags";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useUserSearchCount } from "./hooks/useUserSearchCount";
import { usePetPolicyFilters } from "@/hooks/usePetPolicyFilters";
import type { SearchSectionProps } from "./types";
import type { PetPolicyFilterParams, TravelMethodFilter } from "@/types/policy-filters";

export const SearchSection = ({ onSearchResults }: SearchSectionProps) => {
  const { user, profile } = useUser();
  const { isSearchLoading, handleFlightSearch } = useFlightSearch();
  const { searchCount, isUnlimited, isPlanReady } = useUserSearchCount();
  const { savedSearches, handleDeleteSearch, saveFlight } = useSavedSearches(user?.id);
  const { validateSearch } = useSearchValidation();
  
  // Use app settings for API provider
  const { apiProvider = DEFAULT_API_PROVIDER, enableFallback = false } = useAppSettings();
  
  // Initialize default filters - note the travel method now uses an object structure
  const defaultFilters: PetPolicyFilterParams = {
    travelMethod: { cabin: true, cargo: true }
  };
  
  // Use policy filters with default values
  const { 
    filters: activeFilters, 
    applyFilters, 
    isFiltering 
  } = usePetPolicyFilters(defaultFilters);
  
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

  const { handlePolicySearch, handleRouteSearch, isLoading: isSearchHandlerLoading } = useSearchHandler({
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
    activeFilters,
    searchCount,
    isUnlimited
  });

  // Combine all loading states to determine overall loading status
  const isLoading = isSearchLoading || isSearchHandlerLoading || isFiltering;
  
  console.log('SearchSection - Profile state:', { 
    isPetCaddie, 
    searchCount
  });

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

  const handleSearch = async (): Promise<void> => {
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
  
  // Handle filter changes
  const handleApplyFilters = async (filters: PetPolicyFilterParams) => {
    // Ensure travelMethod has the correct structure
    const travelMethodFilter: TravelMethodFilter = filters.travelMethod || { cabin: true, cargo: true };
    
    // Apply the filters with correct structure
    await applyFilters({
      ...filters,
      travelMethod: travelMethodFilter
    });
    
    // If a search is already active, automatically trigger a new search with filters
    if (policySearch || (origin && destination && date)) {
      handleSearch();
    }
  };

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
        activeFilters={activeFilters}
        onApplyFilters={handleApplyFilters}
      />
    </div>
  );
};
