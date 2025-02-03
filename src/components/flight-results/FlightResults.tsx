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

  return (
    <div className="space-y-4">
      {flights.map((flight, index) => {
        // If flight has connections, create a group of cards
        if (flight.connections && flight.connections.length > 0) {
          return (
            <div key={`${flight.carrierFsCode}-${flight.flightNumber}-${index}`} className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-500">
                  {flight.connections.length + 1} Leg Journey
                </span>
              </div>
              <FlightCard
                {...flight}
                policy={petPolicies?.[flight.carrierFsCode]}
                isConnection={false}
              />
              {flight.connections.map((connection, connIndex) => (
                <FlightCard
                  key={`${connection.carrierFsCode}-${connection.flightNumber}-${connIndex}`}
                  {...connection}
                  policy={petPolicies?.[connection.carrierFsCode]}
                  isConnection={true}
                />
              ))}
            </div>
          );
        }
        
        // For direct flights, show single card
        return (
          <FlightCard
            key={`${flight.carrierFsCode}-${flight.flightNumber}-${index}`}
            {...flight}
            policy={petPolicies?.[flight.carrierFsCode]}
            isConnection={false}
          />
        );
      })}
    </div>
  );
};