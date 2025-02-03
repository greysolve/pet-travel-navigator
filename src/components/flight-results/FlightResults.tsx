import { FlightCard } from "./FlightCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { FlightData, PetPolicy } from "./types";

interface FlightResultsProps {
  flights: FlightData[];
  petPolicies?: Record<string, PetPolicy>;
}

export const FlightResults = ({ flights, petPolicies }: FlightResultsProps) => {
  if (flights.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6">
        <p className="text-center text-gray-600">No flights found for the selected route and date.</p>
      </div>
    );
  }

  // Group flights by journey
  const journeys = flights.reduce((acc: FlightData[][], flight) => {
    if (flight.connections) {
      // This is already a journey with connections
      acc.push([flight]);
    } else {
      // Check if this flight is part of a journey
      const existingJourney = acc.find(journey => 
        journey.some(f => f.flightNumber === flight.flightNumber)
      );
      
      if (!existingJourney) {
        // Start a new journey
        acc.push([flight]);
      }
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {journeys.map((journey, journeyIndex) => {
        const mainFlight = journey[0];
        const connectingFlights = mainFlight.connections || [];
        const hasConnections = connectingFlights.length > 0;

        return (
          <div key={`journey-${journeyIndex}`} className="bg-white rounded-lg shadow-sm">
            <FlightCard
              {...mainFlight}
              policy={petPolicies?.[mainFlight.carrierFsCode]}
            />
            
            {hasConnections && (
              <div className="border-t">
                <div className="px-6 py-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-4">
                    {connectingFlights.length} Connecting Flight{connectingFlights.length > 1 ? 's' : ''}
                  </h3>
                  <div className="space-y-4">
                    {connectingFlights.map((flight, flightIndex) => {
                      // Only show policy if it's different from the main flight
                      const showPolicy = flight.carrierFsCode !== mainFlight.carrierFsCode;
                      return (
                        <div 
                          key={`${flight.flightNumber}-${flightIndex}`} 
                          className="border-l-2 border-primary pl-4"
                        >
                          <FlightCard
                            {...flight}
                            policy={showPolicy ? petPolicies?.[flight.carrierFsCode] : undefined}
                            isConnection={true}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};