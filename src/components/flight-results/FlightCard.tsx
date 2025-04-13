
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
      className="flight-card"
    >
      <div className="flight-card-header">
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
        <CollapsibleTrigger className="view-details-button">
          {isOpen ? (
            <>Hide Details</>
          ) : (
            <>View Details</>
          )}
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent className="flight-card-content">
        <div className="flight-details-content">
          {petPolicy && (
            <div className="policy-section">
              <h3 className="section-title">Pet Policy</h3>
              <PolicyDetails policy={petPolicy} />
            </div>
          )}
          
          <div className="details-section">
            <h3 className="section-title">Flight Details</h3>
            <div className="details-grid">
              <div className="detail-item">
                <p className="detail-label">Airline</p>
                <p className="detail-value">{airlineName || carrierFsCode}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Flight Number</p>
                <p className="detail-value">{flightNumber}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Departure</p>
                <p className="detail-value">
                  {new Date(departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {departureAirport}
                </p>
                {departureTerminal && <p className="detail-note">Terminal {departureTerminal}</p>}
              </div>
              <div className="detail-item">
                <p className="detail-label">Arrival</p>
                <p className="detail-value">
                  {new Date(arrivalTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {arrivalAirport}
                </p>
                {arrivalTerminal && <p className="detail-note">Terminal {arrivalTerminal}</p>}
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
