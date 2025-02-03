import { Card, CardContent } from "@/components/ui/card";
import { PawPrint, ArrowRight } from "lucide-react";
import { FlightHeader } from "./FlightHeader";
import { PolicyDetails } from "./PolicyDetails";
import type { PetPolicy } from "./types";

type FlightCardProps = {
  carrierFsCode: string;
  airlineName?: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  policy?: PetPolicy;
  isConnection?: boolean;
};

export const FlightCard = ({
  carrierFsCode,
  airlineName,
  flightNumber,
  departureTime,
  arrivalTime,
  policy,
  isConnection,
}: FlightCardProps) => {
  return (
    <Card className={isConnection ? "ml-8 border-l-4 border-l-primary" : ""}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          {isConnection && (
            <div className="absolute -left-6 top-1/2 -translate-y-1/2">
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
          )}
          <FlightHeader
            carrierFsCode={carrierFsCode}
            airlineName={airlineName}
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