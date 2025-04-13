
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
    <div className="flex items-center p-4 flex-grow">
      <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center text-base font-medium text-primary mr-4">
        {carrierFsCode}
      </div>
      
      <div className="flex-grow grid grid-cols-3 gap-2">
        <div>
          <p className="font-medium text-sm text-neutral-800">
            {airlineName || carrierFsCode}
          </p>
          <Badge variant="outline" className="font-normal text-xs mt-1">
            {flightNumber}
          </Badge>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-2">
            <div className="text-center">
              <p className="font-medium text-sm">
                {departure.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
              <p className="text-xs text-neutral-500">
                {departureAirport}
              </p>
            </div>
            
            <div className="flex-grow mx-1 h-[1px] bg-neutral-200 relative">
              <div className="text-xs text-neutral-500 absolute -top-4 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                {hours}h {minutes}m
              </div>
            </div>
            
            <div className="text-center">
              <p className="font-medium text-sm">
                {arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
              <p className="text-xs text-neutral-500">
                {arrivalAirport}
              </p>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          {departureTerminal && (
            <p className="text-xs text-neutral-500">
              From Terminal {departureTerminal}
            </p>
          )}
          {arrivalTerminal && (
            <p className="text-xs text-neutral-500">
              To Terminal {arrivalTerminal}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
