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
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <Accordion type="single" collapsible className="w-full">
        {mainFlights.map((flight, index) => {
          const connectingFlights = flight.connections || [];
          const hasConnections = connectingFlights.length > 0;

          return (
            <AccordionItem 
              key={`${flight.flightNumber}-${index}`} 
              value={`flight-${index}`}
              className={index !== mainFlights.length - 1 ? "border-b" : ""}
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">
                          {flight.airlineName || flight.carrierFsCode}
                        </h3>
                        <span className="text-sm text-gray-500">({flight.carrierFsCode})</span>
                      </div>
                      <p className="text-sm text-gray-600">{flight.flightNumber}</p>
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
                  </div>
                  <div className="flex items-center gap-4">
                    {hasConnections && (
                      <span className="text-sm text-gray-500">
                        {connectingFlights.length} stop{connectingFlights.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <PawPrint className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <div className="px-6 pb-6 space-y-6">
                  {/* Main Flight Policy */}
                  {petPolicies?.[flight.carrierFsCode] && (
                    <div className="border-t pt-4">
                      <PolicyDetails policy={petPolicies[flight.carrierFsCode]} />
                    </div>
                  )}

                  {/* Connecting Flights */}
                  {hasConnections && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-700">Connecting Flights</h4>
                      {connectingFlights.map((connection, connectionIndex) => (
                        <div 
                          key={`${connection.flightNumber}-${connectionIndex}`}
                          className="bg-accent/20 rounded-lg p-4 space-y-4"
                        >
                          <div className="flex items-center justify-between">
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
                              <div className="border-t pt-4">
                                <PolicyDetails policy={petPolicies[connection.carrierFsCode]} />
                              </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};