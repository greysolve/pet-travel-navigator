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

  // Get destination country from the first flight (only for flight searches)
  const destinationCountry = flights[0]?.arrivalCountry;
  console.log("Destination country for policy lookup:", destinationCountry);

  // Fetch destination country's pet policy
  const { data: countryPolicies } = useCountryPolicy(destinationCountry);

  // Debug log to check flights data
  console.log("Flights data in ResultsSection:", flights);
  console.log("Pet policies in ResultsSection:", petPolicies);
  console.log("Country policies:", countryPolicies);

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
          {countryPolicies?.map((policy, index) => (
            <DestinationPolicy key={policy.id || index} policy={policy} />
          ))}
        </div>
      </div>
    </div>
  );
};