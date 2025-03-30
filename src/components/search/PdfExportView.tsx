
import { PolicyDetails } from "../flight-results/PolicyDetails";
import { DestinationPolicy } from "../flight-results/DestinationPolicy";
import { Badge } from "@/components/ui/badge";
import { ArrowDown } from "lucide-react";
import type { FlightData, PetPolicy, CountryPolicy } from "../flight-results/types";

interface PdfExportViewProps {
  flights: FlightData[];
  petPolicies?: Record<string, PetPolicy>;
  countryPolicies?: CountryPolicy[];
}

export const PdfExportView = ({ flights, petPolicies, countryPolicies }: PdfExportViewProps) => {
  return (
    <div className="w-[800px] mx-auto p-8 bg-white space-y-8">
      {/* Title Page */}
      <div className="page-break-after">
        <h1 className="text-3xl font-bold mb-8 text-center">Flight Itinerary & Pet Travel Requirements</h1>
        {flights[0]?.segments?.[0] && (
          <div className="text-xl font-bold text-center mb-4">
            {flights[0].segments[0].departureAirportFsCode} =&gt; {flights[0].segments[flights[0].segments.length - 1].arrivalAirportFsCode} on {
              new Date(flights[0].segments[0].departureTime).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            }
          </div>
        )}
        <div className="text-center text-gray-600 mt-4">
          Generated on {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>
      
      {/* Flight Itinerary Section */}
      <div className="space-y-6">
        {flights.map((journey, journeyIndex) => {
          const segments = journey.segments || [];
          const totalDuration = segments.reduce((total, segment) => total + (segment.elapsedTime || 0), 0);
          const stops = segments.length - 1;
          
          return (
            <div 
              key={`journey-${journeyIndex}`} 
              className="bg-white rounded-lg shadow-lg overflow-hidden page-break-inside-avoid border-b pb-6 mb-6"
            >
              {/* Journey Summary */}
              <div className="bg-accent p-4 flex justify-between items-center">
                <p className="text-sm font-medium text-accent-foreground">
                  {stops === 0 ? 'Non-Stop Flight' : `${stops} Stop${stops > 1 ? 's' : ''} • ${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`}
                </p>
                <div className="text-accent-foreground hover:text-accent-foreground/80 inline-flex items-center">
                  View Country Policies <ArrowDown className="ml-1 h-4 w-4" />
                </div>
              </div>

              {/* Flight Segments */}
              {segments.map((segment, segmentIndex) => {
                const isNotLastSegment = segmentIndex < segments.length - 1;
                const nextSegment = isNotLastSegment ? segments[segmentIndex + 1] : null;
                
                return (
                  <div key={`${segment.flightNumber}-${segmentIndex}`} className="page-break-inside-avoid">
                    <div className="p-6">
                      <div className="flex items-center space-x-6">
                        <div>
                          <p className="font-bold text-lg">
                            {segment.airlineName} ({segment.carrierFsCode})
                          </p>
                          <Badge variant="secondary" className="font-normal">
                            {segment.flightNumber}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Departure</p>
                          <p className="font-medium">
                            {new Date(segment.departureTime).toLocaleTimeString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            {segment.departureAirportFsCode} {segment.departureTerminal && `Terminal ${segment.departureTerminal}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Arrival</p>
                          <p className="font-medium">
                            {new Date(segment.arrivalTime).toLocaleTimeString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            {segment.arrivalAirportFsCode} {segment.arrivalTerminal && `Terminal ${segment.arrivalTerminal}`}
                          </p>
                        </div>
                      </div>

                      {petPolicies?.[segment.carrierFsCode] && (
                        <div className="mt-4">
                          <h2 className="text-xl font-semibold mb-4">
                            Pet Policy for {segment.airlineName}
                          </h2>
                          <PolicyDetails policy={petPolicies[segment.carrierFsCode]} />
                        </div>
                      )}
                    </div>

                    {/* Layover Information */}
                    {isNotLastSegment && nextSegment && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
                        <p className="text-sm text-gray-600">
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

      {/* Country Pet Policies Section */}
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

// Helper function to calculate layover duration
const calculateLayoverDuration = (arrivalTime: string, departureTime: string) => {
  const arrival = new Date(arrivalTime);
  const departure = new Date(departureTime);
  const durationMs = departure.getTime() - arrival.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};
