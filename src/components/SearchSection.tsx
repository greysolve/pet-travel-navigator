
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
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
import type { PetPolicy } from "./flight-results/types";

export const SearchSection = ({ onSearchResults }: SearchSectionProps) => {
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading, initialized } = useProfile();
  const { isSearchLoading, searchCount, isPetCaddie, handleFlightSearch } = useFlightSearch();
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

  const handlePolicySearch = async () => {
    if (!user) return;

    const { data: airline, error: airlineError } = await supabase
      .from('airlines')
      .select('id')
      .eq('name', policySearch)
      .maybeSingle();

    if (airlineError || !airline?.id) {
      console.error("Error finding airline:", airlineError);
      toast({
        title: "Error finding airline",
        description: "Could not find the selected airline.",
        variant: "destructive",
      });
      return;
    }

    console.log("Found airline:", airline);
    const { data: petPolicy, error: policyError } = await supabase
      .from('pet_policies')
      .select('*')
      .eq('airline_id', airline.id)
      .maybeSingle();

    if (policyError) {
      console.error("Error fetching pet policy:", policyError);
      toast({
        title: "Error fetching pet policy",
        description: "Could not fetch the pet policy for the selected airline.",
        variant: "destructive",
      });
      return;
    }

    console.log("Found pet policy:", petPolicy);
    const results: any[] = [];
    onSearchResults(results, { [policySearch]: petPolicy as PetPolicy });
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

  const handleRouteSearch = async () => {
    if (!user) return;

    console.log('Handling route search with:', { origin, destination, date });
    await handleFlightSearch({
      origin,
      destination,
      date: date!,
      onSearchResults: async (results, policies) => {
        onSearchResults(results, policies);
        setFlights(results);
        
        if (shouldSaveSearch && user) {
          const { error: saveError } = await supabase
            .from('saved_searches')
            .insert({
              user_id: user.id,
              search_criteria: {
                origin,
                destination,
                date: date!.toISOString()
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
      },
      onSearchComplete: () => {}
    });
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
