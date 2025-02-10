import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FlightData, PetPolicy } from "./types";
import { useAuth } from "@/contexts/AuthContext";
import { decorateWithPremiumFields } from "@/utils/policyDecorator";
import { usePremiumFields } from "@/hooks/usePremiumFields";

const COUNTRY_MAPPINGS: Record<string, string> = {
  'USA': 'United States',
  'UK': 'United Kingdom'
};

export const usePetPolicies = (flights: FlightData[]) => {
  const { profile } = useAuth();
  const isPetCaddie = profile?.userRole === 'pet_caddie';
  const { data: premiumFields = [] } = usePremiumFields();

  console.log('[usePetPolicies] Premium fields received:', premiumFields);

  return useQuery({
    queryKey: ['petPolicies', flights.map(journey => 
      journey.segments?.map(segment => segment.carrierFsCode)
    ).flat(), premiumFields],
    queryFn: async () => {
      if (!flights.length) return {};
      
      const carrierCodes = [...new Set(flights.flatMap(journey => 
        journey.segments?.map(segment => segment.carrierFsCode)
      ))];
      
      console.log("[usePetPolicies] Fetching pet policies for airlines:", carrierCodes);
      
      const { data: airlines } = await supabase
        .from('airlines')
        .select('id, iata_code')
        .in('iata_code', carrierCodes);

      if (!airlines?.length) return {};

      const { data: policies, error } = await supabase
        .from('pet_policies')
        .select(`
          *,
          airlines!inner(iata_code)
        `)
        .in('airline_id', airlines.map(a => a.id));

      if (error) {
        console.error("[usePetPolicies] Error fetching policies:", error);
        return {};
      }

      console.log("[usePetPolicies] Raw policies from database:", policies);

      const decoratedPolicies: Record<string, PetPolicy> = {};
      
      for (const policy of policies || []) {
        const policyData: Partial<PetPolicy> = {
          pet_types_allowed: policy.pet_types_allowed || [],
          carrier_requirements: policy.carrier_requirements || null,
          carrier_requirements_cabin: policy.carrier_requirements_cabin || null,
          carrier_requirements_cargo: policy.carrier_requirements_cargo || null,
          documentation_needed: policy.documentation_needed || [],
          temperature_restrictions: policy.temperature_restrictions || null,
          breed_restrictions: policy.breed_restrictions || [],
          policy_url: policy.policy_url || null,
          size_restrictions: typeof policy.size_restrictions === 'object' ? {
            max_weight_cabin: policy.size_restrictions?.max_weight_cabin || undefined,
            max_weight_cargo: policy.size_restrictions?.max_weight_cargo || undefined,
            carrier_dimensions_cabin: policy.size_restrictions?.carrier_dimensions_cabin || undefined
          } : null,
          fees: typeof policy.fees === 'object' ? {
            in_cabin: policy.fees?.in_cabin || undefined,
            cargo: policy.fees?.cargo || undefined
          } : null
        };

        console.log(`[usePetPolicies] Processing policy for ${policy.airlines.iata_code}:`, {
          rawPolicy: policyData,
          isPetCaddie,
          premiumFields
        });
        
        decoratedPolicies[policy.airlines.iata_code] = isPetCaddie 
          ? decorateWithPremiumFields(policyData, premiumFields)
          : policyData as PetPolicy;

        console.log(`[usePetPolicies] Decorated policy for ${policy.airlines.iata_code}:`, 
          decoratedPolicies[policy.airlines.iata_code]
        );
      }
      
      return decoratedPolicies;
    },
    enabled: flights.length > 0,
  });
};

export const useCountryPolicies = (countries: string[]) => {
  return useQuery({
    queryKey: ['countryPolicies', countries],
    queryFn: async () => {
      if (!countries.length) {
        console.log("No countries provided");
        return [];
      }
      
      console.log(`Looking up policies for countries:`, countries);
      
      // Get both arrival and transit policies directly using country names
      const { data: policies, error } = await supabase
        .from('country_policies')
        .select('*')
        .in('country_code', countries)
        .in('policy_type', ['pet_arrival', 'pet_transit']);

      if (error) {
        console.error("Error fetching country policies:", error);
        return [];
      }

      console.log(`Found ${policies?.length || 0} policies:`, policies);
      return policies || [];
    },
    enabled: countries.length > 0,
    retry: 3,
    retryDelay: 2000,
  });
};
