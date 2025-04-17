
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import type { PetPolicy } from "./types";
import { PolicyDetails } from "./PolicyDetails";

type MobileFlightCardProps = {
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

export const MobileFlightCard = ({
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
}: MobileFlightCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Calculate flight duration
  const departure = new Date(departureTime);
  const arrival = new Date(arrivalTime);
  const durationMs = arrival.getTime() - departure.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen}
      className="mobile-flight-card"
    >
      <div className="mobile-flight-header">
        <div className="mobile-airline-info">
          <div className="mobile-airline-logo">
            {carrierFsCode}
          </div>
          <div>
            <p className="mobile-airline-name">{airlineName || carrierFsCode}</p>
            <Badge variant="outline" className="mobile-flight-number">{flightNumber}</Badge>
          </div>
        </div>
        
        <div className="mobile-times">
          <div className="mobile-departure">
            <p className="mobile-time">{departure.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            <p className="mobile-airport">{departureAirport}</p>
          </div>
          
          <div className="mobile-duration">
            <div className="mobile-duration-line"></div>
            <p className="mobile-duration-text">{hours}h {minutes}m</p>
          </div>
          
          <div className="mobile-arrival">
            <p className="mobile-time">{arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            <p className="mobile-airport">{arrivalAirport}</p>
          </div>
        </div>
        
        <CollapsibleTrigger className="mobile-trigger">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span className="mobile-trigger-text">{isOpen ? "Hide" : "Details"}</span>
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent className="mobile-flight-content">
        <div className="mobile-details">
          {departureTerminal && (
            <div className="mobile-terminal-info">
              <span className="mobile-label">Departure:</span> Terminal {departureTerminal}
            </div>
          )}
          
          {arrivalTerminal ? (
            <div className="mobile-terminal-info">
              <span className="mobile-label">Arrival:</span> Terminal {arrivalTerminal}
            </div>
          ) : (
            <div className="mobile-terminal-info">
              <span className="mobile-label">Arrival:</span> Terminal Not Available
            </div>
          )}
          
          {petPolicy && (
            <div className="mobile-policy">
              <h3 className="mobile-policy-header">Pet Policy</h3>
              <PolicyDetails policy={petPolicy} />
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
