import type { FlightData } from "../flight-results/types";

interface ExportViewProps {
  flights: FlightData[];
}

export const ExportView = ({ flights }: ExportViewProps) => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Flight Itinerary</h1>
      
      {flights.map((journey, journeyIndex) => (
        <div key={journeyIndex} className="border-b pb-4">
          <div className="text-sm text-gray-500 mb-2">
            {journey.stops === 0 ? 'Direct Flight' : `${journey.stops} Stop${journey.stops > 1 ? 's' : ''}`}
          </div>
          
          {journey.segments?.map((segment, segIndex) => (
            <div key={segIndex} className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <div className="font-semibold">
                  {segment.carrierFsCode} {segment.flightNumber}
                </div>
                <div className="text-sm">
                  {new Date(segment.departureTime).toLocaleDateString()}
                </div>
              </div>
              
              <div className="flex justify-between text-sm">
                <div>
                  <div className="font-medium">{segment.departureAirportFsCode}</div>
                  <div className="text-gray-500">
                    {new Date(segment.departureTime).toLocaleTimeString()}
                  </div>
                  {segment.departureTerminal && (
                    <div className="text-gray-500">Terminal {segment.departureTerminal}</div>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="font-medium">{segment.arrivalAirportFsCode}</div>
                  <div className="text-gray-500">
                    {new Date(segment.arrivalTime).toLocaleTimeString()}
                  </div>
                  {segment.arrivalTerminal && (
                    <div className="text-gray-500">Terminal {segment.arrivalTerminal}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
      
      <div className="text-xs text-gray-400 text-center mt-4">
        Generated via PawsOnBoard
      </div>
    </div>
  );
};