import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FlightCard } from "./flight-results/FlightCard";
import { DestinationPolicy } from "./flight-results/DestinationPolicy";
import type { FlightData, PetPolicy } from "./flight-results/types";

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

  // Get destination country from the first flight (assuming all flights go to same destination)
  const destinationCountry = flights[0]?.arrivalCountry;

  // Fetch destination country's pet policy
  const { data: countryPolicy } = useQuery({
    queryKey: ['countryPolicy', destinationCountry],
    queryFn: async () => {
      if (!destinationCountry) return null;
      console.log("Fetching pet policy for country:", destinationCountry);
      
      const { data: policy } = await supabase
        .from('country_policies')
        .select('*')
        .eq('country_code', destinationCountry)
        .eq('policy_type', 'pet')
        .single();

      console.log("Found country policy:", policy);
      return policy;
    },
    enabled: !!destinationCountry,
  });

  if (!searchPerformed) return null;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="space-y-8">
        <div className="space-y-4">
          {flights.map((flight, index) => (
            <FlightCard
              key={`${flight.carrierFsCode}-${flight.flightNumber}-${index}`}
              {...flight}
              policy={petPolicies?.[flight.carrierFsCode]}
            />
          ))}
        </div>
        <DestinationPolicy policy={countryPolicy} />
      </div>
    </div>
  );
};