import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PawPrint } from "lucide-react";

interface FlightCardProps {
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  petPolicy: string;
}

export const FlightCard = ({
  airline,
  flightNumber,
  departureTime,
  arrivalTime,
  petPolicy,
}: FlightCardProps) => {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold">{airline}</CardTitle>
        <Badge variant="secondary" className="font-normal">
          {flightNumber}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">Departure</p>
            <p className="font-medium">{departureTime}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Arrival</p>
            <p className="font-medium">{arrivalTime}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <PawPrint className="h-5 w-5 text-primary mt-0.5" />
          <p className="text-sm">{petPolicy}</p>
        </div>
      </CardContent>
    </Card>
  );
};