
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
    <div className="flight-header">
      <div className="airline-logo">
        <div className="airline-code">{carrierFsCode}</div>
      </div>
      
      <div className="flight-info">
        <div className="airline-details">
          <p className="airline-name">
            {airlineName || carrierFsCode}
          </p>
          <Badge variant="outline" className="flight-number">
            {flightNumber}
          </Badge>
        </div>
        
        <div className="flight-route">
          <div className="departure">
            <p className="time">
              {departure.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
            <p className="airport">
              {departureAirport}
            </p>
          </div>
          
          <div className="flight-duration">
            <div className="timeline">
              <div className="timeline-line"></div>
              <div className="timeline-dot"></div>
              <div className="timeline-dot"></div>
            </div>
            <div className="duration-text">
              {hours}h {minutes}m
            </div>
          </div>
          
          <div className="arrival">
            <p className="time">
              {arrival.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
            <p className="airport">
              {arrivalAirport}
            </p>
          </div>
        </div>
        
        <div className="terminal-info">
          {departureTerminal && (
            <p className="terminal-text">
              From Terminal {departureTerminal}
            </p>
          )}
          {arrivalTerminal && (
            <p className="terminal-text">
              To Terminal {arrivalTerminal}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
