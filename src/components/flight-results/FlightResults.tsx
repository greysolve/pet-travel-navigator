import { FlightCard } from "./FlightCard";
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
            <div className="p-6">
              <FlightCard
                {...flight}
                policy={petPolicies?.[flight.carrierFsCode]}
              />
            </div>

            {/* Connecting Flights Section */}
            {hasConnections && (
              <div className="border-t bg-accent/20">
                <div className="px-6 py-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-4">
                    {connectingFlights.length} Connecting Flight{connectingFlights.length > 1 ? 's' : ''}
                  </h3>
                  <div className="space-y-4">
                    {connectingFlights.map((connection, connectionIndex) => (
                      <div 
                        key={`${connection.flightNumber}-${connectionIndex}`}
                        className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary"
                      >
                        <FlightCard
                          {...connection}
                          policy={connection.carrierFsCode !== flight.carrierFsCode ? petPolicies?.[connection.carrierFsCode] : undefined}
                          isConnection={true}
                        />
                      </div>
                    ))}
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