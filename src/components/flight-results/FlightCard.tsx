
import { FlightHeader } from "./FlightHeader";
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
  isConnection,
}: FlightCardProps) => {
  return (
    <div className="rounded-md bg-white p-4 transition-all duration-200 hover:shadow-md">
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
    </div>
  );
};
