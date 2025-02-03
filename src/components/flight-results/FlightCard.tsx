import { Card, CardContent } from "@/components/ui/card";
import { PawPrint } from "lucide-react";
import { FlightHeader } from "./FlightHeader";
import { PolicyDetails } from "./PolicyDetails";
import type { PetPolicy } from "./types";

type FlightCardProps = {
  carrierFsCode: string;
  airlineName?: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTerminal?: string;
  arrivalTerminal?: string;
  stops?: number;
  policy?: PetPolicy;
  isConnection?: boolean;
};

export const FlightCard = ({
  carrierFsCode,
  airlineName,
  flightNumber,
  departureTime,
  arrivalTime,
  departureAirport,
  arrivalAirport,
  departureTerminal,
  arrivalTerminal,
  stops,
  policy,
  isConnection,
}: FlightCardProps) => {
  return (
    <Card className={`${isConnection ? 'border-0 shadow-none' : ''}`}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <FlightHeader
            carrierFsCode={carrierFsCode}
            airlineName={airlineName}
            flightNumber={flightNumber}
            departureTime={departureTime}
            arrivalTime={arrivalTime}
            departureAirport={departureAirport}
            arrivalAirport={arrivalAirport}
            departureTerminal={departureTerminal}
            arrivalTerminal={arrivalTerminal}
          />
          <div className="flex items-center gap-2">
            {stops && stops > 0 && (
              <span className="text-sm text-gray-500">
                {stops} stop{stops > 1 ? 's' : ''}
              </span>
            )}
            <PawPrint className="h-5 w-5 text-primary" />
          </div>
        </div>
        {policy && <PolicyDetails policy={policy} />}
      </CardContent>
    </Card>
  );
};