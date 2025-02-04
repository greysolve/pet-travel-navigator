import { usePetPolicies, useCountryPolicies } from "./flight-results/PolicyFetcher";
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

  // Extract all unique countries from the journey segments
  const allCountries = flights.reduce((countries: Set<string>, journey) => {
    console.log("Processing journey:", journey);
    
    if (!journey.segments) {
      console.log("No segments found in journey");
      return countries;
    }

    journey.segments.forEach(segment => {
      // Log the entire segment to see what data we're working with
      console.log("Full segment data:", segment);
      
      // Check if we have country data
      if (!segment.departureCountry || !segment.arrivalCountry) {
        console.warn("Missing country data in segment:", {
          departure: segment.departureCountry,
          arrival: segment.arrivalCountry,
          departureAirport: segment.departureAirportFsCode,
          arrivalAirport: segment.arrivalAirportFsCode
        });
      }

      if (segment.departureCountry) {
        console.log("Adding departure country:", segment.departureCountry);
        countries.add(segment.departureCountry);
      }
      if (segment.arrivalCountry) {
        console.log("Adding arrival country:", segment.arrivalCountry);
        countries.add(segment.arrivalCountry);
      }
    });
    return countries;
  }, new Set<string>());

  const uniqueCountries = Array.from(allCountries);
  console.log("Unique countries found:", uniqueCountries);

  // Fetch policies for all unique countries at once
  const { data: countryPolicies, isLoading: isPoliciesLoading } = useCountryPolicies(uniqueCountries);

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
        <div id="country-policies" className="space-y-6">
          <h2 className="text-2xl font-semibold mb-6">Country Pet Policies</h2>
          {flights.length > 0 ? (
            uniqueCountries.length > 0 ? (
              countryPolicies && countryPolicies.length > 0 ? (
                countryPolicies.map((policy, index) => (
                  <DestinationPolicy 
                    key={`${policy.country_code}-${policy.policy_type}-${index}`} 
                    policy={policy} 
                  />
                ))
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <p className="text-gray-500">
                    {isPoliciesLoading ? (
                      `Fetching policies for ${uniqueCountries.join(', ')}...`
                    ) : (
                      'No pet policies found for the selected countries.'
                    )}
                  </p>
                </div>
              )
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-500">
                  No countries found in flight segments. This might be due to missing country data in segments: {
                    flights.map(journey => 
                      journey.segments?.map(segment => 
                        `${segment.departureAirportFsCode}(${segment.departureCountry || 'unknown'}) -> ${segment.arrivalAirportFsCode}(${segment.arrivalCountry || 'unknown'})`
                      ).join(', ')
                    ).join('; ')
                  }
                </p>
              </div>
            )
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-500">No flights selected.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
