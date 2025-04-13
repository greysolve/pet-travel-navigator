
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { FlightHeader } from "./FlightHeader";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { PetPolicy } from "./types";
import { PolicyDetails } from "./PolicyDetails";

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
      className="rounded-md border border-neutral-100 hover:border-neutral-200 transition-colors"
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
          <button className="p-2 rounded-full hover:bg-neutral-100 transition-colors mr-2">
            {isOpen ? <ChevronUp className="h-4 w-4 text-neutral-500" /> : <ChevronDown className="h-4 w-4 text-neutral-500" />}
          </button>
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="px-4 py-3 border-t border-neutral-100">
          {petPolicy && (
            <div>
              <h3 className="text-base font-medium mb-2 text-neutral-800">Pet Policy</h3>
              <PolicyDetails policy={petPolicy} />
            </div>
          )}
          
          <div className="mt-4">
            <h3 className="text-base font-medium mb-2 text-neutral-800">Flight Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-500">Airline</p>
                <p className="font-medium">{airlineName || carrierFsCode}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Flight Number</p>
                <p className="font-medium">{flightNumber}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Departure</p>
                <p className="font-medium">
                  {new Date(departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {departureAirport}
                </p>
                {departureTerminal && <p className="text-sm text-neutral-500">Terminal {departureTerminal}</p>}
              </div>
              <div>
                <p className="text-sm text-neutral-500">Arrival</p>
                <p className="font-medium">
                  {new Date(arrivalTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {arrivalAirport}
                </p>
                {arrivalTerminal && <p className="text-sm text-neutral-500">Terminal {arrivalTerminal}</p>}
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
