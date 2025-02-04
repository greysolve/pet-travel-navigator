import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";
import type { FlightData, PetPolicy } from "./types";
import { PolicyDetails } from "./PolicyDetails";
import { FlightCard } from "./FlightCard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface FlightResultsProps {
  flights: FlightData[];
  petPolicies?: Record<string, PetPolicy>;
}

export const FlightResults = ({ flights, petPolicies }: FlightResultsProps) => {
  const [airlineNames, setAirlineNames] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const fetchAirlineNames = async () => {
      const carrierCodes = [...new Set(flights.flatMap(journey => 
        journey.segments?.map(segment => segment.carrierFsCode) || []
      ))];
      
      for (const code of carrierCodes) {
        const { data, error } = await supabase
          .from('airlines')
          .select('name')
          .eq('iata_code', code)
          .maybeSingle();
        
        if (data?.name) {
          setAirlineNames(prev => ({
            ...prev,
            [code]: data.name
          }));
        } else {
          console.log(`No airline found for code: ${code}`);
        }
      }
    };

    if (flights.length > 0) {
      fetchAirlineNames();
    }
  }, [flights]);

  console.log("Rendering FlightResults with flights:", flights);
  console.log("Airline names mapping:", airlineNames);
  
  if (flights.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-lg rounded-lg shadow-lg p-6">
        <p className="text-center text-gray-600">No flights found for the selected route and date.</p>
      </div>
    );
  }

  const scrollToCountryPolicies = () => {
    const policySection = document.getElementById('country-policies');
    if (policySection) {
      policySection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {flights.map((journey, journeyIndex) => {
        const segments = journey.segments || [];
        const totalDuration = segments.reduce((total, segment) => total + (segment.elapsedTime || 0), 0);
        const stops = segments.length - 1;
        
        console.log("Processing journey:", {
          segments,
          totalDuration,
          stops
        });
        
        return (
          <div 
            key={`journey-${journeyIndex}`} 
            className="bg-white rounded-lg shadow-lg overflow-hidden"
          >
            {/* Journey Summary */}
            <div className="bg-accent p-4 flex justify-between items-center">
              <p className="text-sm font-medium text-accent-foreground">
                {stops === 0 ? 'Non-Stop Flight' : `${stops} Stop${stops > 1 ? 's' : ''}`}
                {totalDuration && ` • ${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-accent-foreground hover:text-accent-foreground/80"
                onClick={scrollToCountryPolicies}
              >
                View Country Policies <ArrowDown className="ml-1 h-4 w-4" />
              </Button>
            </div>

            {/* Flight Segments */}
            {segments.map((segment, segmentIndex) => {
              const isNotLastSegment = segmentIndex < segments.length - 1;
              const nextSegment = isNotLastSegment ? segments[segmentIndex + 1] : null;
              const airlineName = airlineNames[segment.carrierFsCode];
              
              console.log("Processing segment:", {
                segment,
                isNotLastSegment,
                nextSegment,
                airlineName
              });

              return (
                <div key={`${segment.flightNumber}-${segmentIndex}`}>
                  {/* Flight Segment */}
                  <div className="p-6">
                    <FlightCard
                      carrierFsCode={segment.carrierFsCode}
                      airlineName={airlineName}
                      flightNumber={segment.flightNumber}
                      departureTime={segment.departureTime}
                      arrivalTime={segment.arrivalTime}
                      departureAirport={segment.departureAirportFsCode}
                      arrivalAirport={segment.arrivalAirportFsCode}
                      departureTerminal={segment.departureTerminal}
                      arrivalTerminal={segment.arrivalTerminal}
                    />
                    
                    {petPolicies?.[segment.carrierFsCode] && (
                      <div className="mt-4">
                        <PolicyDetails policy={petPolicies[segment.carrierFsCode]} />
                      </div>
                    )}
                  </div>

                  {/* Layover Information */}
                  {isNotLastSegment && nextSegment && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
                      <p className="text-sm text-gray-600">
                        {calculateLayoverDuration(segment.arrivalTime, nextSegment.departureTime)} layover in {segment.arrivalAirportFsCode}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// Helper function to calculate layover duration
const calculateLayoverDuration = (arrivalTime: string, departureTime: string) => {
  const arrival = new Date(arrivalTime);
  const departure = new Date(departureTime);
  const durationMs = departure.getTime() - arrival.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};