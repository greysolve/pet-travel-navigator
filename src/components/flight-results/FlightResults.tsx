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
      {flights.map((flight, index) => {
        // Get all connections for this flight
        const connections = flight.connections || [];
        const mainAirline = flight.carrierFsCode;
        
        console.log("Processing flight:", {
          mainFlight: flight,
          connections: connections,
          mainAirline: mainAirline
        });
        
        return (
          <div 
            key={`${flight.flightNumber}-${index}`} 
            className="bg-white rounded-lg shadow-lg overflow-hidden"
          >
            {/* Main Flight */}
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
              />
              
              {petPolicies?.[mainAirline] && (
                <div className="mt-4">
                  <PolicyDetails policy={petPolicies[mainAirline]} />
                </div>
              )}
            </div>

            {/* Connecting Flights */}
            {connections.map((connection, connectionIndex) => {
              const showPolicy = connection.carrierFsCode !== mainAirline;
              const layoverDuration = connectionIndex === 0
                ? calculateLayoverDuration(flight.arrivalTime, connection.departureTime)
                : calculateLayoverDuration(connections[connectionIndex - 1].arrivalTime, connection.departureTime);

              console.log("Processing connection:", {
                connection: connection,
                showPolicy: showPolicy,
                layoverDuration: layoverDuration
              });

              return (
                <div 
                  key={`${connection.flightNumber}-${connectionIndex}`}
                  className="border-t border-gray-100"
                >
                  {/* Layover Info */}
                  <div className="bg-gray-50 px-4 py-2">
                    <p className="text-sm text-gray-600">
                      {`${layoverDuration} layover in ${connection.departureAirport}`}
                    </p>
                  </div>
                  
                  {/* Connection Flight */}
                  <div className="p-6 bg-gray-50/50">
                    <div className="pl-6 border-l-2 border-gray-200">
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
                        isConnection={true}
                      />
                      {showPolicy && petPolicies?.[connection.carrierFsCode] && (
                        <div className="mt-4">
                          <PolicyDetails policy={petPolicies[connection.carrierFsCode]} />
                        </div>
                      )}
                    </div>
                  </div>
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
  return `${hours} hr ${minutes} min`;
};