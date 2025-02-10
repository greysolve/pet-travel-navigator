
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FlightData, PetPolicy } from "./types";
import { useAuth } from "@/contexts/AuthContext";
import { decorateWithPremiumFields } from "@/utils/policyDecorator";

const COUNTRY_MAPPINGS: Record<string, string> = {
  'USA': 'United States',
  'UK': 'United Kingdom'
};

export const usePetPolicies = (flights: FlightData[]) => {
  const { profile } = useAuth();
  const isPetCaddie = profile?.userRole === 'pet_caddie';

  return useQuery({
    queryKey: ['petPolicies', flights.map(journey => 
      journey.segments?.map(segment => segment.carrierFsCode)
    ).flat()],
    queryFn: async () => {
      if (!flights.length) return {};
      
      const carrierCodes = [...new Set(flights.flatMap(journey => 
        journey.segments?.map(segment => segment.carrierFsCode)
      ))];
      
      console.log("Fetching pet policies for airlines:", carrierCodes);
      
      const { data: airlines } = await supabase
        .from('airlines')
        .select('id, iata_code')
        .in('iata_code', carrierCodes);

      if (!airlines?.length) return {};

      const { data: policies } = await supabase
        .from('pet_policies')
        .select('*, airlines!inner(iata_code)')
        .in('airline_id', airlines.map(a => a.id));

      console.log("Found pet policies:", policies);

      return policies?.reduce((acc: Record<string, PetPolicy>, policy: any) => {
        const policyData = {
          pet_types_allowed: policy.pet_types_allowed,
          carrier_requirements: policy.carrier_requirements,
          carrier_requirements_cabin: policy.carrier_requirements_cabin,
          carrier_requirements_cargo: policy.carrier_requirements_cargo,
          documentation_needed: policy.documentation_needed,
          temperature_restrictions: policy.temperature_restrictions,
          breed_restrictions: policy.breed_restrictions,
          policy_url: policy.policy_url,
          size_restrictions: policy.size_restrictions,
          fees: policy.fees
        };
        
        acc[policy.airlines.iata_code] = isPetCaddie 
          ? decorateWithPremiumFields(policyData)
          : policyData;
        
        return acc;
      }, {}) || {};
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
