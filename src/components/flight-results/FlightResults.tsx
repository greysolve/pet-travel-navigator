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

  // Filter to get only main flights (not connections)
  const mainFlights = flights.filter(flight => !flight.isConnection);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <Accordion type="single" collapsible className="w-full">
        {mainFlights.map((flight, index) => {
          const connectingFlights = flight.connections || [];
          const totalStops = connectingFlights.length;
          const firstFlight = flight;
          const lastFlight = connectingFlights.length > 0 
            ? connectingFlights[connectingFlights.length - 1] 
            : flight;

          return (
            <AccordionItem 
              key={`${flight.flightNumber}-${index}`} 
              value={`flight-${index}`}
              className={index !== mainFlights.length - 1 ? "border-b" : ""}
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-8">
                    <div className="flex flex-col items-start">
                      <p className="font-medium">
                        {new Date(firstFlight.departureTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-sm text-gray-500">{firstFlight.departureAirport}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-sm text-gray-500">
                        {totalStops === 0 ? 'Nonstop' : `${totalStops} stop${totalStops > 1 ? 's' : ''}`}
                      </div>
                      <div className="w-24 h-px bg-gray-300 my-1" />
                      <PawPrint className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col items-start">
                      <p className="font-medium">
                        {new Date(lastFlight.arrivalTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-sm text-gray-500">{lastFlight.arrivalAirport}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium">
                      {firstFlight.airlineName || firstFlight.carrierFsCode}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <div className="px-6 pb-6 space-y-6">
                  {/* First Flight */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-medium">
                          {firstFlight.airlineName || firstFlight.carrierFsCode} {firstFlight.flightNumber}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {firstFlight.departureAirport} → {firstFlight.arrivalAirport}
                        </p>
                      </div>
                      {petPolicies?.[firstFlight.carrierFsCode] && (
                        <PawPrint className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    {petPolicies?.[firstFlight.carrierFsCode] && (
                      <PolicyDetails policy={petPolicies[firstFlight.carrierFsCode]} />
                    )}
                  </div>

                  {/* Connecting Flights */}
                  {connectingFlights.map((connection, connectionIndex) => (
                    <div key={`${connection.flightNumber}-${connectionIndex}`} className="space-y-4">
                      {/* Layover Information */}
                      <div className="py-2 px-4 bg-accent/20 rounded-lg">
                        <p className="text-sm text-gray-600">
                          {connectionIndex === 0 ? (
                            `${calculateLayoverDuration(firstFlight.arrivalTime, connection.departureTime)} layover in ${connection.departureAirport}`
                          ) : (
                            `${calculateLayoverDuration(connectingFlights[connectionIndex - 1].arrivalTime, connection.departureTime)} layover in ${connection.departureAirport}`
                          )}
                        </p>
                      </div>

                      {/* Connection Flight Details */}
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium">
                              {connection.airlineName || connection.carrierFsCode} {connection.flightNumber}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {connection.departureAirport} → {connection.arrivalAirport}
                            </p>
                          </div>
                          {petPolicies?.[connection.carrierFsCode] && (
                            <PawPrint className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        {connection.carrierFsCode !== firstFlight.carrierFsCode && 
                          petPolicies?.[connection.carrierFsCode] && (
                            <PolicyDetails policy={petPolicies[connection.carrierFsCode]} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
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
  return `${hours} hr ${minutes} min`;
};