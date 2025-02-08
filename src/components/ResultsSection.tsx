
import { usePetPolicies, useCountryPolicies } from "./flight-results/PolicyFetcher";
import { FlightResults } from "./flight-results/FlightResults";
import { DestinationPolicy } from "./flight-results/DestinationPolicy";
import { PolicyDetails } from "./flight-results/PolicyDetails";
import { Skeleton } from "@/components/ui/skeleton";
import type { FlightData, PetPolicy } from "./flight-results/types";

export const ResultsSection = ({ 
  searchPerformed,
  flights = [],
  petPolicies,
}: { 
  searchPerformed: boolean;
  flights?: FlightData[];
  petPolicies?: Record<string, PetPolicy>;
}) => {
  const { data: flightPetPolicies } = usePetPolicies(flights);
  
  // Get unique countries from flights if available
  const countriesFromFlights = flights.reduce((countries: Set<string>, journey) => {
    if (!journey.segments) return countries;
    journey.segments.forEach(segment => {
      if (segment.departureCountry) countries.add(segment.departureCountry);
      if (segment.arrivalCountry) countries.add(segment.arrivalCountry);
    });
    return countries;
  }, new Set<string>());

  // Get countries from origin/destination even if no flights found
  const allCountries = flights.reduce((countries: Set<string>, journey) => {
    if (journey.origin?.country) countries.add(journey.origin.country);
    if (journey.destination?.country) countries.add(journey.destination.country);
    return countries;
  }, new Set(countriesFromFlights));

  // Filter out undefined/null values and convert to array
  const uniqueCountries = Array.from(allCountries).filter(Boolean);
  const { data: countryPolicies, isLoading: isPoliciesLoading } = useCountryPolicies(uniqueCountries);

  if (!searchPerformed) return null;

  // If we have a direct airline policy search result
  if (flights.length === 0 && petPolicies) {
    const airlineName = Object.keys(petPolicies)[0];
    const policy = petPolicies[airlineName];
    
    return (
      <div id="search-results" className="container mx-auto px-4 py-12 animate-fade-in">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Pet Policy for {airlineName}</h2>
          <PolicyDetails policy={policy} />
        </div>
      </div>
    );
  }

  return (
    <div id="search-results" className="container mx-auto px-4 py-12 animate-fade-in">
      <div className="space-y-8">
        {flights.length > 0 && (
          <FlightResults flights={flights} petPolicies={flightPetPolicies} />
        )}
        
        <div id="country-policies" className="space-y-6">
          <h2 className="text-2xl font-semibold mb-6">Country Pet Policies</h2>
          {searchPerformed ? (
            uniqueCountries.length > 0 ? (
              countryPolicies && countryPolicies.length > 0 ? (
                countryPolicies.map((policy, index) => (
                  <div 
                    key={`${policy.country_code}-${policy.policy_type}-${index}`}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <DestinationPolicy policy={policy} />
                  </div>
                ))
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
                  {isPoliciesLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : (
                    <p className="text-gray-500">No pet policies found for the selected countries.</p>
                  )}
                </div>
              )
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
                <p className="text-gray-500">No countries found in search results.</p>
              </div>
            )
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
              <p className="text-gray-500">Please perform a search to view country policies.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
