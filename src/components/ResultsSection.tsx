import { FlightCard } from "@/components/FlightCard";

type FlightData = {
  carrierFsCode: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
};

export const ResultsSection = ({ 
  searchPerformed,
  flights = []
}: { 
  searchPerformed: boolean;
  flights?: FlightData[];
}) => {
  if (!searchPerformed) return null;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {flights.map((flight, index) => (
            <FlightCard
              key={`${flight.carrierFsCode}-${flight.flightNumber}-${index}`}
              airline={flight.carrierFsCode}
              flightNumber={flight.flightNumber}
              departureTime={new Date(flight.departureTime).toLocaleTimeString()}
              arrivalTime={new Date(flight.arrivalTime).toLocaleTimeString()}
              petPolicy="Pet policies vary by route and aircraft type. Please contact the airline for specific details."
            />
          ))}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Destination Pet Policy</h2>
          <p className="text-gray-700">
            Pets entering this destination must have:
            <ul className="list-disc list-inside mt-2 space-y-2">
              <li>Valid pet passport</li>
              <li>Up-to-date vaccinations</li>
              <li>Microchip identification</li>
              <li>Health certificate issued within 10 days of travel</li>
            </ul>
          </p>
        </div>
      </div>
    </div>
  );
};