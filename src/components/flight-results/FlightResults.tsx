import { PawPrint } from "lucide-react";
import type { FlightData, PetPolicy } from "./types";
import { PolicyDetails } from "./PolicyDetails";
import { FlightCard } from "./FlightCard";

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
    <div className="space-y-6">
      {mainFlights.map((flight, index) => {
        const connectingFlights = flight.connections || [];
        const totalStops = connectingFlights.length;

        return (
          <div key={`${flight.flightNumber}-${index}`} className="bg-white rounded-lg shadow-lg">
            {/* Main Flight Section */}
            <div className="p-6">
              <FlightCard
                carrierFsCode={flight.carrierFsCode}
                airlineName={flight.airlineName}
                flightNumber={flight.flightNumber}
                departureTime={flight.departureTime}
                arrivalTime={flight.arrivalTime}
                departureAirport={flight.departureAirport}
                arrivalAirport={flight.arrivalAirport}
                departureTerminal={flight.departureTerminal}
                arrivalTerminal={flight.arrivalTerminal}
                stops={totalStops}
                policy={petPolicies?.[flight.carrierFsCode]}
              />
            </div>

            {/* Connecting Flights Section */}
            {connectingFlights.length > 0 && (
              <div className="border-t divide-y divide-gray-100">
                {connectingFlights.map((connection, connectionIndex) => (
                  <div 
                    key={`${connection.flightNumber}-${connectionIndex}`}
                    className="bg-gray-50"
                  >
                    {/* Layover Information */}
                    <div className="px-6 py-2 bg-gray-100/80">
                      <p className="text-sm text-gray-600">
                        {connectionIndex === 0 ? (
                          `${calculateLayoverDuration(flight.arrivalTime, connection.departureTime)} layover in ${connection.departureAirport}`
                        ) : (
                          `${calculateLayoverDuration(connectingFlights[connectionIndex - 1].arrivalTime, connection.departureTime)} layover in ${connection.departureAirport}`
                        )}
                      </p>
                    </div>

                    {/* Connection Flight Card */}
                    <div className="p-6">
                      <FlightCard
                        carrierFsCode={connection.carrierFsCode}
                        airlineName={connection.airlineName}
                        flightNumber={connection.flightNumber}
                        departureTime={connection.departureTime}
                        arrivalTime={connection.arrivalTime}
                        departureAirport={connection.departureAirport}
                        arrivalAirport={connection.arrivalAirport}
                        departureTerminal={connection.departureTerminal}
                        arrivalTerminal={connection.arrivalTerminal}
                        policy={connection.carrierFsCode !== flight.carrierFsCode ? petPolicies?.[connection.carrierFsCode] : undefined}
                        isConnection={true}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
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
  return `${hours} hr ${minutes} min`;
};