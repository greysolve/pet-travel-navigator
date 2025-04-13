
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
  // Calculate flight duration
  const departure = new Date(departureTime);
  const arrival = new Date(arrivalTime);
  const durationMs = arrival.getTime() - departure.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return (
    <div className="flex flex-col md:flex-row md:items-center p-6 gap-4 flex-grow">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold text-primary">
        {carrierFsCode}
      </div>
      
      <div className="flex-grow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
          <div>
            <p className="font-bold text-lg">
              {airlineName || "Unknown Airline"}
            </p>
            <Badge variant="secondary" className="font-normal">
              {flightNumber}
            </Badge>
          </div>
          
          <div className="mt-2 md:mt-0 text-right">
            <p className="text-sm text-gray-500">Duration</p>
            <p className="font-medium">{hours}h {minutes}m</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mt-2">
          <div>
            <p className="text-sm text-gray-500">Departure</p>
            <p className="font-medium text-lg">
              {departure.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
            {departureAirport && (
              <p className="text-sm text-gray-500">
                {departureAirport} {departureTerminal && `Terminal ${departureTerminal}`}
              </p>
            )}
          </div>
          
          <div className="hidden md:block border-t border-gray-300 flex-grow mx-4 h-0"></div>
          
          <div className="text-right">
            <p className="text-sm text-gray-500">Arrival</p>
            <p className="font-medium text-lg">
              {arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
            {arrivalAirport && (
              <p className="text-sm text-gray-500">
                {arrivalAirport} {arrivalTerminal && `Terminal ${arrivalTerminal}`}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
