import { PolicyDetails } from "../flight-results/PolicyDetails";
import { DestinationPolicy } from "../flight-results/DestinationPolicy";
import type { FlightData, PetPolicy, CountryPolicy } from "../flight-results/types";

interface PdfExportViewProps {
  flights: FlightData[];
  petPolicies?: Record<string, PetPolicy>;
  countryPolicies?: CountryPolicy[];
}

export const PdfExportView = ({ flights, petPolicies, countryPolicies }: PdfExportViewProps) => {
  const carrierCodes = [...new Set(flights.flatMap(journey => 
    journey.segments?.map(segment => segment.carrierFsCode) || []
  ))];

  return (
    <div className="min-w-[1200px] p-8 bg-white space-y-8">
      {/* Title Page */}
      <div className="page-break-after">
        <h1 className="text-3xl font-bold mb-8 text-center">Flight Itinerary & Pet Travel Requirements</h1>
        <div className="text-center text-gray-600 mt-4">
          Generated on {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>
      
      {/* Flight Itinerary Section - Simplified for better performance */}
      <div className="page-break-inside-avoid page-break-after">
        <h2 className="text-2xl font-semibold mb-6">Flight Itinerary</h2>
        {flights.map((journey, journeyIndex) => (
          <div key={journeyIndex} className="border-b pb-6 mb-6 page-break-inside-avoid">
            <div className="text-sm text-gray-500 mb-4">
              {journey.stops === 0 ? 'Direct Flight' : `${journey.stops} Stop${journey.stops > 1 ? 's' : ''}`}
            </div>
            
            {journey.segments?.map((segment, segIndex) => (
              <div key={segIndex} className="mb-6 page-break-inside-avoid">
                <div className="grid grid-cols-2 gap-8 text-base">
                  <div className="space-y-2">
                    <div className="font-medium text-lg">{segment.departureAirportFsCode}</div>
                    <div className="text-gray-700">
                      Departure: {new Date(segment.departureTime).toLocaleTimeString()}
                    </div>
                    {segment.departureTerminal && (
                      <div className="text-gray-600">Terminal {segment.departureTerminal}</div>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-right">
                    <div className="font-medium text-lg">{segment.arrivalAirportFsCode}</div>
                    <div className="text-gray-700">
                      Arrival: {new Date(segment.arrivalTime).toLocaleTimeString()}
                    </div>
                    {segment.arrivalTerminal && (
                      <div className="text-gray-600">Terminal {segment.arrivalTerminal}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Airline Pet Policies Section - Simplified */}
      {petPolicies && carrierCodes.length > 0 && (
        <div className="page-break-before page-break-after">
          <h2 className="text-2xl font-semibold mb-6">Airline Pet Policies</h2>
          <div className="space-y-8">
            {carrierCodes.map(code => (
              <div key={code} className="bg-gray-50 p-6 rounded-lg page-break-inside-avoid">
                <h3 className="font-medium text-lg mb-4">Carrier: {code}</h3>
                <PolicyDetails policy={petPolicies[code]} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Country Pet Policies Section - Simplified */}
      {countryPolicies && countryPolicies.length > 0 && (
        <div className="page-break-before">
          <h2 className="text-2xl font-semibold mb-6">Country Pet Policies</h2>
          <div className="space-y-8">
            {countryPolicies.map((policy, index) => (
              <div key={`${policy.country_code}-${index}`} className="page-break-inside-avoid">
                <DestinationPolicy policy={policy} />
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="text-sm text-gray-400 text-center pt-8 border-t">
        Generated via PawsOnBoard
      </div>
    </div>
  );
};