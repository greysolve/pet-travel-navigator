import type { FlightData, PetPolicy, CountryPolicy } from "../flight-results/types";
import { PolicyDetails } from "../flight-results/PolicyDetails";
import { DestinationPolicy } from "../flight-results/DestinationPolicy";
import { ArrowDown } from "lucide-react";

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
      {/* Jump Link */}
      <div className="sticky top-0 bg-white py-2 border-b text-center">
        <a 
          href="#country-policies" 
          className="inline-flex items-center text-primary hover:text-primary/80"
        >
          Jump to Country Policies <ArrowDown className="ml-1 h-4 w-4" />
        </a>
      </div>

      <div>
        <h1 className="text-3xl font-bold mb-8">Flight Itinerary & Pet Travel Requirements</h1>
        
        {flights.map((journey, journeyIndex) => (
          <div key={journeyIndex} className="border-b pb-6 mb-6">
            <div className="text-sm text-gray-500 mb-4">
              {journey.stops === 0 ? 'Direct Flight' : `${journey.stops} Stop${journey.stops > 1 ? 's' : ''}`}
            </div>
            
            {journey.segments?.map((segment, segIndex) => (
              <div key={segIndex} className="mb-6 page-break-inside-avoid">
                <div className="flex justify-between items-center mb-4 bg-gray-50 p-4 rounded-lg">
                  <div className="font-semibold text-lg">
                    {segment.carrierFsCode} {segment.flightNumber}
                  </div>
                  <div className="text-base">
                    {new Date(segment.departureTime).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                
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

                {petPolicies?.[segment.carrierFsCode] && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">Airline Pet Policy</h3>
                    <PolicyDetails policy={petPolicies[segment.carrierFsCode]} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div id="country-policies" className="pt-8 border-t">
        <h2 className="text-2xl font-semibold mb-6">Country Pet Policies</h2>
        <div className="space-y-8">
          {countryPolicies?.map((policy, index) => (
            <div key={`${policy.country_code}-${index}`} className="page-break-inside-avoid">
              <DestinationPolicy policy={policy} />
            </div>
          ))}
        </div>
      </div>
      
      <div className="text-sm text-gray-400 text-center pt-8 border-t">
        Generated via PawsOnBoard
      </div>
    </div>
  );
};