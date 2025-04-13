
import { PolicyDetails } from "../flight-results/PolicyDetails";
import { DestinationPolicy } from "../flight-results/DestinationPolicy";
import { Badge } from "@/components/ui/badge";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Plane, Clock, ArrowRight } from "lucide-react";
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
      
      {/* Flight Itinerary Section - With accordion for mobile */}
      <div className="space-y-4">
        <Accordion type="multiple" className="space-y-2">
          {flights.map((journey, journeyIndex) => {
            const journeyId = `export-journey-${journeyIndex}`;
            const segments = journey.segments || [];
            const totalDuration = segments.reduce((total, segment) => total + (segment.elapsedTime || 0), 0);
            const stops = segments.length - 1;
            
            // Extract first and last segment for the compact view
            const firstSegment = segments[0];
            const lastSegment = segments[segments.length - 1];
            
            return (
              <AccordionItem 
                key={journeyId} 
                value={journeyId}
                className="border rounded-lg shadow-sm overflow-hidden bg-white"
              >
                <AccordionTrigger className="px-3 py-2 hover:no-underline">
                  <div className="w-full">
                    {/* Compact flight info */}
                    <div className="grid grid-cols-12 gap-2 w-full text-xs">
                      <div className="col-span-3 flex flex-col">
                        <div className="font-medium">
                          {firstSegment.airlineName || firstSegment.carrierFsCode}
                        </div>
                        <div className="text-gray-500 flex items-center">
                          {stops === 0 ? (
                            <span className="flex items-center">
                              <Plane className="h-3 w-3 mr-1" /> Direct
                            </span>
                          ) : (
                            <span>{stops} {stops === 1 ? 'Stop' : 'Stops'}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="col-span-9 flex items-center justify-between">
                        <div className="text-center">
                          <div className="font-bold">
                            {new Date(firstSegment.departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          <div className="text-gray-500">
                            {firstSegment.departureAirportFsCode}
                          </div>
                        </div>
                        
                        <div className="flex-1 mx-2 flex flex-col items-center">
                          <div className="text-gray-500 flex items-center text-[10px]">
                            <Clock className="h-2 w-2 mr-1" /> 
                            {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
                          </div>
                          <div className="w-full flex items-center mt-1">
                            <div className="h-px bg-gray-200 flex-grow"></div>
                            <ArrowRight className="h-2 w-2 mx-1 text-gray-400" />
                            <div className="h-px bg-gray-200 flex-grow"></div>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-bold">
                            {new Date(lastSegment.arrivalTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          <div className="text-gray-500">
                            {lastSegment.arrivalAirportFsCode}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="px-0 pb-0">
                  {/* Detailed flight information when expanded */}
                  {segments.map((segment, segmentIndex) => {
                    const isNotLastSegment = segmentIndex < segments.length - 1;
                    const nextSegment = isNotLastSegment ? segments[segmentIndex + 1] : null;
                    
                    return (
                      <div key={`${segment.flightNumber}-${segmentIndex}`}>
                        <div className="p-3">
                          <div className="flex flex-col space-y-3">
                            <div>
                              <p className="font-bold text-sm">
                                {segment.airlineName || segment.carrierFsCode}
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
                                Pet Policy for {segment.airlineName || segment.carrierFsCode}
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
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* Country Pet Policies Section - Same as before */}
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
