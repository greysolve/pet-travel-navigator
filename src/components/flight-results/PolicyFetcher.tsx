import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { FlightData, PetPolicy } from "./types";

export const usePetPolicies = (flights: FlightData[]) => {
  return useQuery({
    queryKey: ['petPolicies', flights.map(f => f.carrierFsCode)],
    queryFn: async () => {
      if (!flights.length) return {};
      
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
    enabled: flights.length > 0,
  });
};

export const useCountryPolicy = (destinationCountry?: string) => {
  return useQuery({
    queryKey: ['countryPolicy', destinationCountry],
    queryFn: async () => {
      if (!destinationCountry) return null;
      
      // First try to get arrival policy
      const { data: arrivalPolicy, error: arrivalError } = await supabase
        .from('country_policies')
        .select('*')
        .eq('country_code', destinationCountry)
        .eq('policy_type', 'pet_arrival')
        .maybeSingle();

      if (arrivalError) {
        console.error("Error fetching arrival policy:", arrivalError);
        return null;
      }

      // If we found an arrival policy, return it
      if (arrivalPolicy) {
        console.log("Found arrival policy:", arrivalPolicy);
        return arrivalPolicy;
      }

      // If no arrival policy, try transit policy
      const { data: transitPolicy, error: transitError } = await supabase
        .from('country_policies')
        .select('*')
        .eq('country_code', destinationCountry)
        .eq('policy_type', 'pet_transit')
        .maybeSingle();

      if (transitError) {
        console.error("Error fetching transit policy:", transitError);
        return null;
      }

      console.log("Found transit policy:", transitPolicy);

      if (!arrivalPolicy && !transitPolicy) {
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

      return transitPolicy || null;
    },
    enabled: !!destinationCountry,
  });
};