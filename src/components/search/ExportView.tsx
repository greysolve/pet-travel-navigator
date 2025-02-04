import type { FlightData, PetPolicy } from "../flight-results/types";
import { PolicyDetails } from "../flight-results/PolicyDetails";
import { DestinationPolicy } from "../flight-results/DestinationPolicy";
import type { CountryPolicy } from "@/types/policies";

interface ExportViewProps {
  flights: FlightData[];
  petPolicies?: Record<string, PetPolicy>;
  countryPolicies?: CountryPolicy[];
}

export const ExportView = ({ flights, petPolicies, countryPolicies }: ExportViewProps) => {
  // Get unique carrier codes from flights
  const carrierCodes = [...new Set(flights.flatMap(journey => 
    journey.segments?.map(segment => segment.carrierFsCode) || []
  ))];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-6">Flight Itinerary</h1>
        
        {flights.map((journey, journeyIndex) => (
          <div key={journeyIndex} className="border-b pb-4 mb-4">
            <div className="text-sm text-gray-500 mb-2">
              {journey.stops === 0 ? 'Direct Flight' : `${journey.stops} Stop${journey.stops > 1 ? 's' : ''}`}
            </div>
            
            {journey.segments?.map((segment, segIndex) => (
              <div key={segIndex} className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-semibold">
                    {segment.carrierFsCode} {segment.flightNumber}
                  </div>
                  <div className="text-sm">
                    {new Date(segment.departureTime).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <div>
                    <div className="font-medium">{segment.departureAirportFsCode}</div>
                    <div className="text-gray-500">
                      {new Date(segment.departureTime).toLocaleTimeString()}
                    </div>
                    {segment.departureTerminal && (
                      <div className="text-gray-500">Terminal {segment.departureTerminal}</div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">{segment.arrivalAirportFsCode}</div>
                    <div className="text-gray-500">
                      {new Date(segment.arrivalTime).toLocaleTimeString()}
                    </div>
                    {segment.arrivalTerminal && (
                      <div className="text-gray-500">Terminal {segment.arrivalTerminal}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {petPolicies && carrierCodes.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Airline Pet Policies</h2>
          {carrierCodes.map(code => (
            <div key={code} className="mb-4">
              <h3 className="font-medium mb-2">Carrier: {code}</h3>
              <PolicyDetails policy={petPolicies[code]} />
            </div>
          ))}
        </div>
      )}

      {countryPolicies && countryPolicies.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Country Pet Policies</h2>
          {countryPolicies.map((policy, index) => (
            <DestinationPolicy key={`${policy.country_code}-${index}`} policy={policy} />
          ))}
        </div>
      )}
      
      <div className="text-xs text-gray-400 text-center mt-4">
        Generated via PawsOnBoard
      </div>
    </div>
  );
};