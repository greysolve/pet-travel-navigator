
import { Badge } from "@/components/ui/badge";
import { Plane } from "lucide-react";

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
  
  // Removing the unused formatTerminal function
  
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6 space-y-4 lg:space-y-0">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Plane className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-bold text-lg text-gray-800">
            {airlineName || "Unknown Airline"}
          </p>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="font-normal border-secondary/30 text-secondary">
              {flightNumber}
            </Badge>
            <span className="text-xs text-gray-500">{carrierFsCode}</span>
          </div>
        </div>
      </div>
      
      <div className="flex space-x-6 mt-2 lg:mt-0">
        <div className="border-l pl-4 lg:pl-6 border-gray-200">
          <p className="text-sm text-gray-500">Departure</p>
          <p className="font-medium text-[#1A1F2C]">
            {new Date(departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          {departureAirport && (
            <p className="text-sm text-gray-500">
              {departureAirport}
              {departureTerminal && departureTerminal !== "NAN" ? (
                <span className="ml-1 text-green-500">· Terminal {departureTerminal}</span>
              ) : (
                <span className="ml-1 text-gray-500">· Not Available</span>
              )}
            </p>
          )}
        </div>
        <div className="border-l pl-4 lg:pl-6 border-gray-200">
          <p className="text-sm text-gray-500">Arrival</p>
          <p className="font-medium text-[#1A1F2C]">
            {new Date(arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          {arrivalAirport && (
            <p className="text-sm text-gray-500">
              {arrivalAirport}
              {arrivalTerminal && arrivalTerminal !== "NAN" ? (
                <span className="ml-1 text-green-500">· Terminal {arrivalTerminal}</span>
              ) : (
                <span className="ml-1 text-gray-500">· Not Available</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
