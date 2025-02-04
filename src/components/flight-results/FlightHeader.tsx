import { Badge } from "@/components/ui/badge";

type FlightHeaderProps = {
  carrierFsCode: string;
  airlineName?: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTerminal?: string;
  arrivalTerminal?: string;
};

export const FlightHeader = ({
  carrierFsCode,
  airlineName,
  flightNumber,
  departureTime,
  arrivalTime,
  departureAirport,
  arrivalAirport,
  departureTerminal,
  arrivalTerminal,
}: FlightHeaderProps) => {
  console.log("FlightHeader props:", { carrierFsCode, airlineName, flightNumber });
  
  return (
    <div className="flex items-center space-x-6">
      <div>
        <p className="font-bold text-lg">
          {airlineName || "Unknown Airline"} ({carrierFsCode})
        </p>
        <Badge variant="secondary" className="font-normal">
          {flightNumber}
        </Badge>
      </div>
      <div>
        <p className="text-sm text-gray-500">Departure</p>
        <p className="font-medium">
          {new Date(departureTime).toLocaleTimeString()}
        </p>
        {departureAirport && (
          <p className="text-sm text-gray-500">
            {departureAirport} {departureTerminal && `Terminal ${departureTerminal}`}
          </p>
        )}
      </div>
      <div>
        <p className="text-sm text-gray-500">Arrival</p>
        <p className="font-medium">
          {new Date(arrivalTime).toLocaleTimeString()}
        </p>
        {arrivalAirport && (
          <p className="text-sm text-gray-500">
            {arrivalAirport} {arrivalTerminal && `Terminal ${arrivalTerminal}`}
          </p>
        )}
      </div>
    </div>
  );
};