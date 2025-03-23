
import { PolicyDetails } from "../flight-results/PolicyDetails";
import { DestinationPolicy } from "../flight-results/DestinationPolicy";
import { Badge } from "@/components/ui/badge";
import type { FlightData, PetPolicy, CountryPolicy } from "../flight-results/types";

interface MobileExportViewProps {
  flights: FlightData[];
  petPolicies?: Record<string, PetPolicy>;
  countryPolicies?: CountryPolicy[];
}

export const MobileExportView = ({ flights, petPolicies, countryPolicies }: MobileExportViewProps) => {
  return (
    <div className="w-full mx-auto p-6 bg-white space-y-6">
      {/* Title Page - Simplified for mobile */}
      <div>
        <h1 className="text-xl font-bold mb-4 text-center">Flight Itinerary & Pet Travel Requirements</h1>
        {flights[0]?.segments?.[0] && (
          <div className="text-base font-bold text-center mb-4">
            {flights[0].segments[0].departureAirportFsCode} =&gt; {flights[0].segments[flights[0].segments.length - 1].arrivalAirportFsCode}
            <div className="text-sm font-normal mt-1">
              {new Date(flights[0].segments[0].departureTime).toLocaleDateString()}
            </div>
          </div>
        )}
        <div className="text-center text-gray-600 text-xs mt-2">
          Generated on {new Date().toLocaleDateString()}
        </div>
      </div>
      
      {/* Flight Itinerary Section - Simplified for mobile */}
      <div className="space-y-4">
        {flights.map((journey, journeyIndex) => {
          const segments = journey.segments || [];
          const totalDuration = segments.reduce((total, segment) => total + (segment.elapsedTime || 0), 0);
          const stops = segments.length - 1;
          
          return (
            <div 
              key={`journey-${journeyIndex}`} 
              className="bg-white rounded-lg shadow overflow-hidden border-b pb-4 mb-4"
            >
              {/* Journey Summary */}
              <div className="bg-accent p-3">
                <p className="text-xs font-medium text-accent-foreground">
                  {stops === 0 ? 'Non-Stop Flight' : `${stops} Stop${stops > 1 ? 's' : ''} • ${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`}
                </p>
              </div>

              {/* Flight Segments - Simplified for mobile */}
              {segments.map((segment, segmentIndex) => {
                const isNotLastSegment = segmentIndex < segments.length - 1;
                const nextSegment = isNotLastSegment ? segments[segmentIndex + 1] : null;
                
                return (
                  <div key={`${segment.flightNumber}-${segmentIndex}`}>
                    <div className="p-3">
                      <div className="flex flex-col space-y-3">
                        <div>
                          <p className="font-bold text-sm">
                            {segment.airlineName} ({segment.carrierFsCode})
                          </p>
                          <Badge variant="secondary" className="font-normal text-xs">
                            {segment.flightNumber}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-xs">
                          <div>
                            <p className="text-gray-500">From</p>
                            <p className="font-medium">
                              {segment.departureAirportFsCode}
                            </p>
                            <p className="text-xs">
                              {new Date(segment.departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-500">To</p>
                            <p className="font-medium">
                              {segment.arrivalAirportFsCode}
                            </p>
                            <p className="text-xs">
                              {new Date(segment.arrivalTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </div>
                        </div>
                      </div>

                      {petPolicies?.[segment.carrierFsCode] && (
                        <div className="mt-3 text-xs">
                          <h2 className="text-sm font-semibold mb-2">
                            Pet Policy for {segment.airlineName}
                          </h2>
                          <PolicyDetails policy={petPolicies[segment.carrierFsCode]} />
                        </div>
                      )}
                    </div>

                    {/* Layover Information */}
                    {isNotLastSegment && nextSegment && (
                      <div className="border-t border-gray-100 bg-gray-50 px-3 py-1">
                        <p className="text-xs text-gray-600">
                          {calculateLayoverDuration(segment.arrivalTime, nextSegment.departureTime)} layover in {segment.arrivalAirportFsCode}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Country Pet Policies Section - Simplified for mobile */}
      {countryPolicies && countryPolicies.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Country Pet Policies</h2>
          <div className="space-y-4">
            {countryPolicies.map((policy, index) => (
              <div key={`${policy.country_code}-${index}`} className="text-sm">
                <DestinationPolicy policy={policy} />
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="text-xs text-gray-400 text-center pt-4 border-t">
        Generated via PawsOnBoard
      </div>
    </div>
  );
};

// Helper function to calculate layover duration
const calculateLayoverDuration = (arrivalTime: string, departureTime: string) => {
  const arrival = new Date(arrivalTime);
  const departure = new Date(departureTime);
  const durationMs = departure.getTime() - arrival.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};
