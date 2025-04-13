
import { useState } from "react";
import { ArrowDown, Plane, Clock } from "lucide-react";
import type { FlightData, PetPolicy } from "./types";
import { PolicyDetails } from "./PolicyDetails";
import { FlightCard } from "./FlightCard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from "@/components/ui/accordion";
import { CompactFlightCard } from "./CompactFlightCard";

interface FlightResultsProps {
  flights: FlightData[];
  petPolicies?: Record<string, PetPolicy>;
  apiProvider?: string;
}

export const FlightResults = ({ flights, petPolicies, apiProvider }: FlightResultsProps) => {
  const [airlineNames, setAirlineNames] = useState<Record<string, string>>({});
  const [expandedJourneys, setExpandedJourneys] = useState<string[]>([]);
  
  // Same useEffect as before
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

  // Use useEffect to fetch airline names
  useState(() => {
    if (flights.length > 0) {
      fetchAirlineNames();
    }
  });

  console.log("Rendering FlightResults with flights:", flights);
  console.log("Airline names mapping:", airlineNames);
  console.log("Pet policies:", petPolicies);
  
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
    <div className="space-y-4">
      <div className="sticky top-0 z-10 p-3 bg-background/80 backdrop-blur-md border-b flex justify-between items-center">
        <p className="text-sm font-medium">
          {flights.length} {flights.length === 1 ? 'Flight' : 'Flights'} Found
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

      <Accordion 
        type="multiple" 
        className="space-y-4" 
        value={expandedJourneys}
        onValueChange={setExpandedJourneys}
      >
        {flights.map((journey, journeyIndex) => {
          const journeyId = `journey-${journeyIndex}`;
          const segments = journey.segments || [];
          const totalDuration = segments.reduce((total, segment) => total + (segment.elapsedTime || 0), 0);
          const stops = segments.length - 1;
          
          return (
            <AccordionItem 
              key={journeyId} 
              value={journeyId}
              className="border rounded-lg shadow-sm overflow-hidden bg-white"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <CompactFlightCard 
                  journey={journey}
                  totalDuration={totalDuration}
                  stops={stops}
                  airlineNames={airlineNames}
                />
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-0">
                {segments.map((segment, segmentIndex) => {
                  const isNotLastSegment = segmentIndex < segments.length - 1;
                  const nextSegment = isNotLastSegment ? segments[segmentIndex + 1] : null;
                  const airlineName = airlineNames[segment.carrierFsCode];
                  
                  return (
                    <div key={`${segment.flightNumber}-${segmentIndex}`}>
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
                        
                        {petPolicies && petPolicies[segment.carrierFsCode] && (
                          <div className="mt-4">
                            <h2 className="text-xl font-semibold mb-4">
                              Pet Policy for {airlineName || segment.carrierFsCode}
                            </h2>
                            <PolicyDetails policy={petPolicies[segment.carrierFsCode]} />
                          </div>
                        )}
                      </div>

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
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
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
