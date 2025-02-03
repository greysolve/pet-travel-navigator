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

  // Group flights by journey
  const journeys = flights.reduce((acc: FlightData[][], flight) => {
    if (flight.connections) {
      // This is already a journey with connections
      acc.push([flight, ...flight.connections]);
    } else {
      // Check if this flight is part of a journey
      const existingJourney = acc.find(journey => 
        journey.some(f => f.flightNumber === flight.flightNumber)
      );
      
      if (!existingJourney) {
        // Start a new journey
        acc.push([flight]);
      }
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {journeys.map((journey, journeyIndex) => (
        <div key={`journey-${journeyIndex}`} className="space-y-2">
          {journey.length > 1 && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-500">
                {journey.length}-Flight Journey
              </span>
            </div>
          )}
          {journey.map((flight, flightIndex) => (
            <FlightCard
              key={`${flight.carrierFsCode}-${flight.flightNumber}-${flightIndex}`}
              {...flight}
              policy={petPolicies?.[flight.carrierFsCode]}
              isConnection={flightIndex > 0}
            />
          ))}
        </div>
      ))}
    </div>
  );
};