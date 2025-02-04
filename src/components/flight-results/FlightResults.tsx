import { PawPrint } from "lucide-react";
import type { FlightData, PetPolicy } from "./types";
import { PolicyDetails } from "./PolicyDetails";
import { FlightCard } from "./FlightCard";

interface FlightResultsProps {
  flights: FlightData[];
  petPolicies?: Record<string, PetPolicy>;
}

export const FlightResults = ({ flights, petPolicies }: FlightResultsProps) => {
  console.log("Rendering FlightResults with flights:", flights);
  
  if (flights.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6">
        <p className="text-center text-gray-600">No flights found for the selected route and date.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {flights.map((journey, index) => {
        const segments = journey.segments || [];
        console.log("Processing journey:", {
          segments: segments,
          totalDuration: journey.totalDuration,
          stops: journey.stops
        });
        
        return (
          <div 
            key={`journey-${index}`} 
            className="bg-white rounded-lg shadow-lg overflow-hidden"
          >
            {/* Journey Summary */}
            <div className="bg-accent p-4">
              <p className="text-sm font-medium text-accent-foreground">
                {journey.stops === 0 ? 'Direct Flight' : `${journey.stops} Stop${journey.stops > 1 ? 's' : ''}`}
                {journey.totalDuration && ` • ${Math.floor(journey.totalDuration / 60)}h ${journey.totalDuration % 60}m`}
              </p>
            </div>

            {/* Flight Segments */}
            {segments.map((segment, segmentIndex) => {
              const isNotLastSegment = segmentIndex < segments.length - 1;
              const nextSegment = isNotLastSegment ? segments[segmentIndex + 1] : null;
              
              console.log("Processing segment:", {
                segment: segment,
                isNotLastSegment: isNotLastSegment,
                nextSegment: nextSegment
              });

              return (
                <div key={`${segment.flightNumber}-${segmentIndex}`}>
                  {/* Flight Segment */}
                  <div className="p-6">
                    <FlightCard
                      carrierFsCode={segment.carrierFsCode}
                      airlineName={segment.airlineName}
                      flightNumber={segment.flightNumber}
                      departureTime={segment.departureTime}
                      arrivalTime={segment.arrivalTime}
                      departureAirport={segment.departureAirport}
                      arrivalAirport={segment.arrivalAirport}
                      departureTerminal={segment.departureTerminal}
                      arrivalTerminal={segment.arrivalTerminal}
                    />
                    
                    {petPolicies?.[segment.carrierFsCode] && (
                      <div className="mt-4">
                        <PolicyDetails policy={petPolicies[segment.carrierFsCode]} />
                      </div>
                    )}
                  </div>

                  {/* Layover Information */}
                  {isNotLastSegment && nextSegment && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
                      <p className="text-sm text-gray-600">
                        {calculateLayoverDuration(segment.arrivalTime, nextSegment.departureTime)} layover in {segment.arrivalAirport}
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