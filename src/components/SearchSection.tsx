import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { usePetPolicies, useCountryPolicies } from "./flight-results/PolicyFetcher";
import { useFlightSearch } from "./search/FlightSearchHandler";
import { useSavedSearches } from "./search/hooks/useSavedSearches";
import { useFlightSearchState } from "./search/hooks/useFlightSearchState";
import { useSearchValidation } from "./search/hooks/useSearchValidation";
import { SearchFormHeader } from "./search/SearchFormHeader";
import { AirlinePolicySearch } from "./search/AirlinePolicySearch";
import { RouteSearch } from "./search/RouteSearch";
import { DateSelector } from "./search/DateSelector";
import { SearchButton } from "./search/SearchButton";
import { SearchDivider } from "./search/SearchDivider";
import { SaveSearch } from "./search/SaveSearch";
import type { SearchSectionProps, SavedSearch } from "./search/types";
import type { PetPolicy } from "./flight-results/types";

export const SearchSection = ({ onSearchResults }: SearchSectionProps) => {
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading, initialized } = useProfile();
  const { handleFlightSearch, isSearching: searchInProgress, searchCount, isPetCaddie } = useFlightSearch();
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
    toast
  } = useFlightSearchState(user?.id);

  const isLoading = authLoading || profileLoading || !initialized || searchInProgress;

  const handleLoadSearch = (searchCriteria: SavedSearch['search_criteria']) => {
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
      console.log("Searching for airline policy:", policySearch);
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
      const results = [];
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
    } else if (origin && destination && date) {
      handleFlightSearch({
        origin,
        destination,
        date,
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
                  date: date.toISOString()
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
    }
  };

  const { data: flightPetPolicies } = usePetPolicies(flights);
  const { data: countryPolicies } = useCountryPolicies(
    Array.from(flights.reduce((countries: Set<string>, journey) => {
      journey.segments?.forEach(segment => {
        if (segment.departureCountry) countries.add(segment.departureCountry);
        if (segment.arrivalCountry) countries.add(segment.arrivalCountry);
      });
      return countries;
    }, new Set<string>()))
  );

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

        <AirlinePolicySearch 
          policySearch={policySearch}
          setPolicySearch={setPolicySearch}
          isLoading={isLoading}
        />
        
        <SearchDivider />

        <RouteSearch
          origin={origin}
          destination={destination}
          setOrigin={setOrigin}
          setDestination={setDestination}
          isLoading={isLoading}
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

        <SearchButton
          isLoading={isLoading}
          isProfileLoading={isLoading}
          onClick={handleSearch}
        />
      </div>
    </div>
  );
};
