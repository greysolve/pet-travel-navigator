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

  // Filter out flights that are connections
  const mainFlights = flights.filter(flight => !flight.isConnection);

  return (
    <div className="space-y-6">
      {mainFlights.map((flight, index) => {
        const connectingFlights = flight.connections || [];
        const hasConnections = connectingFlights.length > 0;

        return (
          <div key={`${flight.flightNumber}-${index}`} className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div>
                    <p className="font-bold text-lg">
                      {flight.airlineName || flight.carrierFsCode} 
                      <span className="text-sm font-normal text-gray-500">({flight.carrierFsCode})</span>
                    </p>
                    <p className="text-sm text-gray-500">{flight.flightNumber}</p>
                  </div>
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
                <PawPrint className="h-5 w-5 text-primary" />
              </div>

              {petPolicies?.[flight.carrierFsCode] && (
                <PolicyDetails policy={petPolicies[flight.carrierFsCode]} />
              )}
            </div>

            {hasConnections && (
              <Accordion type="single" collapsible>
                <AccordionItem value="connections" className="border-t border-gray-200">
                  <AccordionTrigger className="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">
                    {connectingFlights.length} Connecting Flight{connectingFlights.length > 1 ? 's' : ''}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 px-6 pb-4">
                      {connectingFlights.map((connection, connectionIndex) => (
                        <div 
                          key={`${connection.flightNumber}-${connectionIndex}`}
                          className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary/30"
                        >
                          <div className="bg-accent/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-6">
                                <div>
                                  <p className="font-bold text-lg">
                                    {connection.airlineName || connection.carrierFsCode} 
                                    <span className="text-sm font-normal text-gray-500">({connection.carrierFsCode})</span>
                                  </p>
                                  <p className="text-sm text-gray-500">{connection.flightNumber}</p>
                                </div>
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
                              <PawPrint className="h-5 w-5 text-primary" />
                            </div>
                            {connection.carrierFsCode !== flight.carrierFsCode && 
                              petPolicies?.[connection.carrierFsCode] && (
                                <PolicyDetails policy={petPolicies[connection.carrierFsCode]} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        );
      })}
    </div>
  );
};