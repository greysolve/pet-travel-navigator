import { Card, CardContent } from "@/components/ui/card";
import { PawPrint } from "lucide-react";
import { FlightHeader } from "./FlightHeader";
import { PolicyDetails } from "./PolicyDetails";
import type { PetPolicy } from "./types";

type FlightCardProps = {
  carrierFsCode: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  policy?: PetPolicy;
};

export const FlightCard = ({
  carrierFsCode,
  flightNumber,
  departureTime,
  arrivalTime,
  policy,
}: FlightCardProps) => {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <FlightHeader
            carrierFsCode={carrierFsCode}
            flightNumber={flightNumber}
            departureTime={departureTime}
            arrivalTime={arrivalTime}
          />
          <div className="flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-primary" />
          </div>
        </div>
        <PolicyDetails policy={policy} />
      </CardContent>
    </Card>
  );
};