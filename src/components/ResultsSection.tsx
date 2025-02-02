import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FlightCard } from "./flight-results/FlightCard";
import { DestinationPolicy } from "./flight-results/DestinationPolicy";
import type { FlightData, PetPolicy } from "./flight-results/types";
import { toast } from "@/hooks/use-toast";

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

  // Get destination country from the first flight
  const destinationCountry = flights[0]?.arrivalCountry;
  console.log("Destination country for policy lookup:", destinationCountry);

  // Fetch destination country's pet policy
  const { data: countryPolicy } = useQuery({
    queryKey: ['countryPolicy', destinationCountry],
    queryFn: async () => {
      if (!destinationCountry) return null;
      
      const { data: policy, error } = await supabase
        .from('country_policies')
        .select('*')
        .eq('country_code', destinationCountry)
        .maybeSingle();

      if (error) {
        console.error("Error fetching country policy:", error);
        return null;
      }

      console.log("Found country policy:", policy);

      if (!policy) {
        console.log("No policy found, triggering sync...");
        try {
          const { error: syncError } = await supabase.functions.invoke('sync_country_policies', {
            body: { 
              lastProcessedItem: null,
              currentProcessed: 0,
              currentTotal: 0,
              processedItems: [],
              errorItems: [],
              startTime: new Date().toISOString(),
            }
          });
          
          if (syncError) throw syncError;
          
          toast({
            title: "Syncing Country Policies",
            description: "We're fetching the latest country policies. Please try your search again in a few moments.",
          });
        } catch (error) {
          console.error("Error triggering sync:", error);
          toast({
            variant: "destructive",
            title: "Sync Error",
            description: "Failed to sync country policies. Please try again later.",
          });
        }
      }

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
