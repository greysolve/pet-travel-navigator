import { FlightCard } from "./FlightCard";
import { PolicyDetails } from "./PolicyDetails";
import { PawPrint } from "lucide-react";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
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

  // Filter out flights that are connections (they will be shown within their main flight card)
  const mainFlights = flights.filter(flight => !flight.isConnection);

  return (
    <div className="space-y-6">
      {mainFlights.map((flight, index) => {
        const connectingFlights = flight.connections || [];
        const hasConnections = connectingFlights.length > 0;

        return (
          <div key={`${flight.flightNumber}-${index}`} className="bg-white rounded-lg shadow-lg">
            {/* Main Flight Card */}
            <FlightCard
              {...flight}
              policy={petPolicies?.[flight.carrierFsCode]}
            />

            {/* Connecting Flights Section */}
            {hasConnections && (
              <div className="border-t">
                <Accordion type="single" collapsible>
                  <AccordionItem value="connections" className="border-0">
                    <AccordionTrigger className="px-6 py-2 text-sm font-medium text-gray-500">
                      {connectingFlights.length} Connecting Flight{connectingFlights.length > 1 ? 's' : ''}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 px-6 pb-4">
                        {connectingFlights.map((connection, connectionIndex) => (
                          <div 
                            key={`${connection.flightNumber}-${connectionIndex}`}
                            className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary/30"
                          >
                            <FlightCard
                              {...connection}
                              policy={connection.carrierFsCode !== flight.carrierFsCode ? 
                                petPolicies?.[connection.carrierFsCode] : undefined}
                              isConnection={true}
                            />
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};