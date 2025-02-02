import { usePetPolicies, useCountryPolicy } from "./flight-results/PolicyFetcher";
import { FlightResults } from "./flight-results/FlightResults";
import { DestinationPolicy } from "./flight-results/DestinationPolicy";
import type { FlightData } from "./flight-results/types";

export const ResultsSection = ({ 
  searchPerformed,
  flights = []
}: { 
  searchPerformed: boolean;
  flights?: FlightData[];
}) => {
  // Get pet policies for all airlines in the flights array
  const { data: petPolicies } = usePetPolicies(flights);

  // Get destination country from the first flight
  const destinationCountry = flights[0]?.arrivalCountry;
  console.log("Destination country for policy lookup:", destinationCountry);

  // Fetch destination country's pet policy
  const { data: countryPolicy } = useCountryPolicy(destinationCountry);

  if (!searchPerformed) return null;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="space-y-8">
        <FlightResults flights={flights} petPolicies={petPolicies} />
        {destinationCountry && <DestinationPolicy policy={countryPolicy} />}
      </div>
    </div>
  );
};