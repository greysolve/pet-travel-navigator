import { usePetPolicies, useCountryPolicy } from "./flight-results/PolicyFetcher";
import { FlightResults } from "./flight-results/FlightResults";
import { DestinationPolicy } from "./flight-results/DestinationPolicy";
import { PolicyDetails } from "./flight-results/PolicyDetails";
import type { FlightData, PetPolicy } from "./flight-results/types";

export const ResultsSection = ({ 
  searchPerformed,
  flights = [],
  petPolicies
}: { 
  searchPerformed: boolean;
  flights?: FlightData[];
  petPolicies?: Record<string, PetPolicy>;
}) => {
  // Only fetch policies for flights if we're doing a flight search
  const { data: flightPetPolicies } = usePetPolicies(flights);

  // Get all unique countries from the journey
  const allCountries = flights.reduce((countries: string[], journey) => {
    journey.segments?.forEach(segment => {
      if (segment.arrivalCountry && !countries.includes(segment.arrivalCountry)) {
        countries.push(segment.arrivalCountry);
      }
    });
    return countries;
  }, []);

  console.log("All countries in journey for policy lookup:", allCountries);

  // Fetch policies for all countries in the journey
  const countryPoliciesResults = allCountries.map(country => 
    useCountryPolicy(country)
  );

  // Combine all policies
  const allPolicies = countryPoliciesResults.reduce((acc: any[], result) => {
    if (result.data) {
      acc.push(...result.data);
    }
    return acc;
  }, []);

  console.log("All country policies:", allPolicies);

  if (!searchPerformed) return null;

  // If we have a direct airline policy search result
  if (flights.length === 0 && petPolicies) {
    const airlineName = Object.keys(petPolicies)[0];
    const policy = petPolicies[airlineName];
    
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Pet Policy for {airlineName}</h2>
          <PolicyDetails policy={policy} />
        </div>
      </div>
    );
  }

  // Otherwise show flight results with their policies
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="space-y-8">
        <FlightResults flights={flights} petPolicies={flightPetPolicies} />
        <div id="country-policies">
          {allPolicies?.map((policy, index) => (
            <DestinationPolicy key={policy.id || index} policy={policy} />
          ))}
        </div>
      </div>
    </div>
  );
};
