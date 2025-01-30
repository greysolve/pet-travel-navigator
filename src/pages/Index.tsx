import { useState } from "react";
import { SearchForm } from "@/components/SearchForm";
import { FlightCard } from "@/components/FlightCard";
import { Plane, Paw } from "lucide-react";

// Mock data for demonstration
const mockFlights = [
  {
    airline: "PawAir",
    flightNumber: "PA123",
    departureTime: "09:00 AM",
    arrivalTime: "11:30 AM",
    petPolicy: "Cats and small dogs allowed in cabin. Carriers must fit under seat.",
  },
  {
    airline: "FurryFlights",
    flightNumber: "FF456",
    departureTime: "02:15 PM",
    arrivalTime: "04:45 PM",
    petPolicy: "All pets must travel in cargo hold. Health certificate required.",
  },
];

const Index = () => {
  const [searchPerformed, setSearchPerformed] = useState(false);

  const handleSearch = (origin: string, destination: string) => {
    console.log("Searching flights from", origin, "to", destination);
    setSearchPerformed(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent to-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Paw className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold text-primary">PawPort</h1>
          </div>
          <p className="text-xl text-gray-600 mb-8">
            Find pet-friendly flights for your furry travel companion
          </p>
          <SearchForm onSearch={handleSearch} />
        </div>

        {searchPerformed && (
          <div className="space-y-8 mt-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockFlights.map((flight, index) => (
                <FlightCard key={index} {...flight} />
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
        )}
      </div>
    </div>
  );
};

export default Index;