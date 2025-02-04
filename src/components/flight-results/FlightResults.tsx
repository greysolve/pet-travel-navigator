import { PawPrint } from "lucide-react";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import type { FlightData, PetPolicy } from "./types";
import { PolicyDetails } from "./PolicyDetails";

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

  // Filter out flights that are connections
  const mainFlights = flights.filter(flight => !flight.isConnection);

  return (
    <div className="space-y-6">
      {mainFlights.map((flight, index) => {
        const connectingFlights = flight.connections || [];
        const hasConnections = connectingFlights.length > 0;

        return (
          <div key={`${flight.flightNumber}-${index}`} className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Main Flight Section */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold">
                      {flight.airlineName || flight.carrierFsCode}
                    </h3>
                    <span className="text-sm text-gray-500">({flight.carrierFsCode})</span>
                  </div>
                  <p className="text-sm text-gray-600">{flight.flightNumber}</p>
                </div>
                <PawPrint className="h-5 w-5 text-primary" />
              </div>

              <div className="flex items-center gap-12">
                <div>
                  <p className="text-sm text-gray-500">Departure</p>
                  <p className="font-medium">
                    {new Date(flight.departureTime).toLocaleTimeString()}
                  </p>
                  {flight.departureAirport && (
                    <p className="text-sm text-gray-500">{flight.departureAirport}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Arrival</p>
                  <p className="font-medium">
                    {new Date(flight.arrivalTime).toLocaleTimeString()}
                  </p>
                  {flight.arrivalAirport && (
                    <p className="text-sm text-gray-500">{flight.arrivalAirport}</p>
                  )}
                </div>
              </div>

              {petPolicies?.[flight.carrierFsCode] && (
                <div className="mt-4 pt-4 border-t">
                  <PolicyDetails policy={petPolicies[flight.carrierFsCode]} />
                </div>
              )}
            </div>

            {/* Connecting Flights Section */}
            {hasConnections && (
              <div className="border-t border-gray-100">
                <Accordion type="single" collapsible>
                  <AccordionItem value="connections" className="border-0">
                    <AccordionTrigger className="px-6 py-2">
                      {connectingFlights.length} Connecting Flight{connectingFlights.length > 1 ? 's' : ''}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 px-6 pb-6">
                        {connectingFlights.map((connection, connectionIndex) => (
                          <div 
                            key={`${connection.flightNumber}-${connectionIndex}`}
                            className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary/30"
                          >
                            <div className="bg-accent/20 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">
                                      {connection.airlineName || connection.carrierFsCode}
                                    </h4>
                                    <span className="text-sm text-gray-500">({connection.carrierFsCode})</span>
                                  </div>
                                  <p className="text-sm text-gray-600">{connection.flightNumber}</p>
                                </div>
                                <PawPrint className="h-5 w-5 text-primary" />
                              </div>

                              <div className="flex items-center gap-12">
                                <div>
                                  <p className="text-sm text-gray-500">Departure</p>
                                  <p className="font-medium">
                                    {new Date(connection.departureTime).toLocaleTimeString()}
                                  </p>
                                  {connection.departureAirport && (
                                    <p className="text-sm text-gray-500">{connection.departureAirport}</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Arrival</p>
                                  <p className="font-medium">
                                    {new Date(connection.arrivalTime).toLocaleTimeString()}
                                  </p>
                                  {connection.arrivalAirport && (
                                    <p className="text-sm text-gray-500">{connection.arrivalAirport}</p>
                                  )}
                                </div>
                              </div>

                              {connection.carrierFsCode !== flight.carrierFsCode && 
                                petPolicies?.[connection.carrierFsCode] && (
                                  <div className="mt-4 pt-4 border-t">
                                    <PolicyDetails policy={petPolicies[connection.carrierFsCode]} />
                                  </div>
                              )}
                            </div>
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