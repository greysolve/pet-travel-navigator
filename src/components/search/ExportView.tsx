import { useEffect, useState } from "react";
import type { FlightData } from "../flight-results/types";

export const ExportView = () => {
  const [flights, setFlights] = useState<FlightData[]>([]);
  
  useEffect(() => {
    // Get flights data from the results section
    const resultsElement = document.getElementById('search-results');
    if (resultsElement) {
      // We'll need to implement a way to pass the data here
      // For now, we'll just show what we can access
    }
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold mb-4">Flight Results Summary</h1>
      
      {flights.map((journey, index) => (
        <div key={index} className="border-b pb-4">
          {journey.segments?.map((segment, segIndex) => (
            <div key={segIndex} className="flex justify-between items-center text-sm">
              <div>
                <span className="font-semibold">{segment.carrierFsCode} {segment.flightNumber}</span>
                <span className="mx-2">•</span>
                <span>{new Date(segment.departureTime).toLocaleTimeString()}</span>
              </div>
              <div className="text-right">
                <span>{segment.departureAirportFsCode}</span>
                <span className="mx-2">→</span>
                <span>{segment.arrivalAirportFsCode}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
      
      <div className="text-xs text-gray-500 mt-4">
        Generated via PawsOnBoard
      </div>
    </div>
  );
};