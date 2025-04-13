
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { FlightHeader } from "./FlightHeader";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  petPolicy?: PetPolicy;
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
  petPolicy,
}: FlightCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen}
      className="rounded-md border border-gray-100 hover:border-gray-200 transition-colors"
    >
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
        <CollapsibleTrigger asChild>
          <button className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-4">
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="px-6 py-4 border-t border-gray-100">
          {petPolicy && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Pet Policy</h3>
              <p className="text-gray-600">
                {petPolicy.description || "No detailed policy information available."}
              </p>
              {/* More pet policy details could be displayed here */}
            </div>
          )}
          
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Flight Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Airline</p>
                <p className="font-medium">{airlineName || carrierFsCode}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Flight Number</p>
                <p className="font-medium">{flightNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Departure</p>
                <p className="font-medium">
                  {new Date(departureTime).toLocaleTimeString()} • {departureAirport}
                </p>
                {departureTerminal && <p className="text-sm text-gray-500">Terminal {departureTerminal}</p>}
              </div>
              <div>
                <p className="text-sm text-gray-500">Arrival</p>
                <p className="font-medium">
                  {new Date(arrivalTime).toLocaleTimeString()} • {arrivalAirport}
                </p>
                {arrivalTerminal && <p className="text-sm text-gray-500">Terminal {arrivalTerminal}</p>}
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
