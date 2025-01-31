import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PawPrint } from "lucide-react";

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
        <div className="space-y-4">
          {flights.map((flight, index) => (
            <Card key={`${flight.carrierFsCode}-${flight.flightNumber}-${index}`}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center space-x-6">
                  <div>
                    <p className="font-bold text-lg">{flight.carrierFsCode}</p>
                    <Badge variant="secondary" className="font-normal">
                      {flight.flightNumber}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Departure</p>
                    <p className="font-medium">
                      {new Date(flight.departureTime).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Arrival</p>
                    <p className="font-medium">
                      {new Date(flight.arrivalTime).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PawPrint className="h-5 w-5 text-primary" />
                  <p className="text-sm">Pet policies vary by route and aircraft type</p>
                </div>
              </CardContent>
            </Card>
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