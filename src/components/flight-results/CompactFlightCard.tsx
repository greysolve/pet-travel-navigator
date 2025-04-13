
import { Plane, Clock, ArrowRight } from "lucide-react";
import type { FlightData } from "./types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CompactFlightCardProps {
  journey: FlightData;
  totalDuration: number;
  stops: number;
  airlineNames: Record<string, string>;
}

export const CompactFlightCard = ({ 
  journey, 
  totalDuration, 
  stops, 
  airlineNames 
}: CompactFlightCardProps) => {
  const segments = journey.segments || [];
  
  if (segments.length === 0) return null;
  
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  
  const departureTime = new Date(firstSegment.departureTime);
  const arrivalTime = new Date(lastSegment.arrivalTime);

  // Format times in a more readable way
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get airline names for display
  const getAirlineDisplay = () => {
    if (segments.length === 1) {
      const airlineName = airlineNames[firstSegment.carrierFsCode] || firstSegment.carrierFsCode;
      return airlineName;
    } else {
      const airlines = [...new Set(segments.map(s => airlineNames[s.carrierFsCode] || s.carrierFsCode))];
      return airlines.length > 1 
        ? `${airlines[0]} + ${airlines.length - 1} more`
        : airlines[0];
    }
  };

  const isDirect = stops === 0;
  const airlineDisplay = getAirlineDisplay();

  return (
    <div className="grid grid-cols-12 gap-2 w-full">
      {/* Airline and flight type */}
      <div className="col-span-3 md:col-span-2 flex flex-col justify-center items-start">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="font-medium text-sm truncate max-w-full">{airlineDisplay}</p>
            </TooltipTrigger>
            <TooltipContent>
              <p>{airlineDisplay}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="flex items-center text-xs mt-1">
          {isDirect ? (
            <span className="flex items-center text-orange font-medium">
              <Plane className="h-3 w-3 mr-1 text-green-500" /> Direct
            </span>
          ) : (
            <span className="flex items-center text-gray-500">
              <span className="mr-1">{stops}</span> {stops === 1 ? 'Stop' : 'Stops'}
            </span>
          )}
        </div>
      </div>

      {/* Times and airports */}
      <div className="col-span-7 md:col-span-8 flex items-center justify-between">
        <div className="text-center">
          <p className="font-bold text-sm text-[#1A1F2C]">{formatTime(departureTime)}</p>
          <p className="text-xs text-gray-500">{firstSegment.departureAirportFsCode}</p>
        </div>
        
        <div className="flex-grow mx-2 flex flex-col items-center">
          <div className="text-xs text-gray-500 flex items-center">
            <Clock className="h-3 w-3 mr-1 text-secondary" /> 
            {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
          </div>
          <div className="w-full flex items-center justify-center mt-1">
            <div className="h-0.5 bg-gray-200 flex-grow"></div>
            <ArrowRight className="h-3 w-3 mx-1 text-green-500" />
            <div className="h-0.5 bg-gray-200 flex-grow"></div>
          </div>
        </div>
        
        <div className="text-center">
          <p className="font-bold text-sm text-[#1A1F2C]">{formatTime(arrivalTime)}</p>
          <p className="text-xs text-gray-500">{lastSegment.arrivalAirportFsCode}</p>
        </div>
      </div>

      {/* Show "View Details" text on desktop */}
      <div className="col-span-2 hidden md:flex items-center justify-end">
        <span className="text-xs text-green-500 font-medium flex items-center group">
          View Details
          <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </div>
  );
};
