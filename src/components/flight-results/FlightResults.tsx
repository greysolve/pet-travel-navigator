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
      {flights.map((flight, index) => (
        <FlightCard
          key={`${flight.carrierFsCode}-${flight.flightNumber}-${index}`}
          {...flight}
          policy={petPolicies?.[flight.carrierFsCode]}
        />
      ))}
    </div>
  );
};