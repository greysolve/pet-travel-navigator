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
      {mainFlights.map((mainFlight, index) => {
        const connectingFlights = mainFlight.connections || [];
        const mainAirline = mainFlight.carrierFsCode;
        
        return (
          <div 
            key={`${mainFlight.flightNumber}-${index}`} 
            className="bg-white rounded-lg shadow-lg overflow-hidden"
          >
            {/* Main Flight */}
            <div className="p-6">
              <FlightCard
                carrierFsCode={mainFlight.carrierFsCode}
                airlineName={mainFlight.airlineName}
                flightNumber={mainFlight.flightNumber}
                departureTime={mainFlight.departureTime}
                arrivalTime={mainFlight.arrivalTime}
                departureAirport={mainFlight.departureAirport}
                arrivalAirport={mainFlight.arrivalAirport}
                departureTerminal={mainFlight.departureTerminal}
                arrivalTerminal={mainFlight.arrivalTerminal}
              />
              {petPolicies?.[mainAirline] && (
                <div className="mt-4">
                  <PolicyDetails policy={petPolicies[mainAirline]} />
                </div>
              )}
            </div>

            {/* Connecting Flights */}
            {connectingFlights.map((connection, connectionIndex) => {
              const showPolicy = connection.carrierFsCode !== mainAirline;
              const layoverDuration = connectionIndex === 0
                ? calculateLayoverDuration(mainFlight.arrivalTime, connection.departureTime)
                : calculateLayoverDuration(connectingFlights[connectionIndex - 1].arrivalTime, connection.departureTime);

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