import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PawPrint, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type FlightData = {
  carrierFsCode: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
};

type PetPolicy = {
  pet_types_allowed: string[];
  carrier_requirements: string;
  documentation_needed: string[];
  temperature_restrictions: string;
  breed_restrictions: string[];
  policy_url?: string;
};

export const ResultsSection = ({ 
  searchPerformed,
  flights = []
}: { 
  searchPerformed: boolean;
  flights?: FlightData[];
}) => {
  // Fetch pet policies for all airlines in the flights array
  const { data: petPolicies } = useQuery({
    queryKey: ['petPolicies', flights.map(f => f.carrierFsCode)],
    queryFn: async () => {
      console.log("Fetching pet policies for airlines:", flights.map(f => f.carrierFsCode));
      const { data: airlines } = await supabase
        .from('airlines')
        .select('id, iata_code')
        .in('iata_code', flights.map(f => f.carrierFsCode));

      if (!airlines?.length) return {};

      const { data: policies } = await supabase
        .from('pet_policies')
        .select('*, airlines!inner(iata_code)')
        .in('airline_id', airlines.map(a => a.id));

      console.log("Found pet policies:", policies);

      // Create a map of airline code to pet policy
      return policies?.reduce((acc: Record<string, PetPolicy>, policy: any) => {
        acc[policy.airlines.iata_code] = {
          pet_types_allowed: policy.pet_types_allowed,
          carrier_requirements: policy.carrier_requirements,
          documentation_needed: policy.documentation_needed,
          temperature_restrictions: policy.temperature_restrictions,
          breed_restrictions: policy.breed_restrictions,
          policy_url: policy.policy_url,
        };
        return acc;
      }, {}) || {};
    },
  });

  if (!searchPerformed) return null;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="space-y-8">
        <div className="space-y-4">
          {flights.map((flight, index) => {
            const policy = petPolicies?.[flight.carrierFsCode];
            
            return (
              <Card key={`${flight.carrierFsCode}-${flight.flightNumber}-${index}`}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div>
                        <p className="font-bold text-lg">{flight.carrierFsCode}</p>
                        <Badge variant="secondary" className="font-normal">
                          {flight.flightNumber}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Departure</p>
                        <p className="font-medium">
                          {new Date(flight.departureTime).toLocaleTimeString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Arrival</p>
                        <p className="font-medium">
                          {new Date(flight.arrivalTime).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PawPrint className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  
                  {policy ? (
                    <div className="text-sm space-y-2 border-t pt-4">
                      {policy.pet_types_allowed?.length > 0 && (
                        <p><span className="font-medium">Allowed pets:</span> {policy.pet_types_allowed.join(', ')}</p>
                      )}
                      {policy.carrier_requirements && (
                        <p><span className="font-medium">Carrier requirements:</span> {policy.carrier_requirements}</p>
                      )}
                      {policy.documentation_needed?.length > 0 && (
                        <p><span className="font-medium">Required documentation:</span> {policy.documentation_needed.join(', ')}</p>
                      )}
                      {policy.temperature_restrictions && (
                        <p><span className="font-medium">Temperature restrictions:</span> {policy.temperature_restrictions}</p>
                      )}
                      {policy.breed_restrictions?.length > 0 && (
                        <p><span className="font-medium">Breed restrictions:</span> {policy.breed_restrictions.join(', ')}</p>
                      )}
                      {policy.policy_url && (
                        <a 
                          href={policy.policy_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-primary hover:text-primary/80 mt-2"
                        >
                          View full policy <ExternalLink className="h-4 w-4 ml-1" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 border-t pt-4">
                      No specific pet policy information available for this airline. Please contact the airline directly.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Destination Pet Policy</h2>
            <a 
              href="https://www.aphis.usda.gov/aphis/pet-travel" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary hover:text-primary/80"
            >
              Official requirements <ExternalLink className="h-4 w-4 ml-1" />
            </a>
          </div>
          <p className="text-gray-700">
            Pets entering this destination must have:
            <ul className="list-disc list-inside mt-2 space-y-2">
              <li>Valid pet passport</li>
              <li>Up-to-date vaccinations</li>
              <li>Microchip identification</li>
              <li>Health certificate issued within 10 days of travel</li>
            </ul>
          </p>
        </div>
      </div>
    </div>
  );
};