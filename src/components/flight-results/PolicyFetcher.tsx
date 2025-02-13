
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FlightData, PetPolicy } from "./types";
import { useProfile } from "@/contexts/ProfileContext";
import { decorateWithPremiumFields } from "@/utils/policyDecorator";
import { usePremiumFields } from "@/hooks/usePremiumFields";

const COUNTRY_MAPPINGS: Record<string, string> = {
  'USA': 'United States',
  'UK': 'United Kingdom'
};

export const usePetPolicies = (flights: FlightData[]) => {
  const { profile } = useProfile();
  // If we have a profile, userRole is guaranteed to exist
  const isPetCaddie = profile ? profile.userRole === 'pet_caddie' : false;
  const { data: premiumFields = [] } = usePremiumFields();

  return useQuery({
    queryKey: ['petPolicies', flights.map(journey => 
      journey.segments?.map(segment => segment.carrierFsCode)
    ).flat(), premiumFields],
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

      const decoratedPolicies: Record<string, PetPolicy> = {};
      
      for (const policy of policies || []) {
        const policyData: Partial<PetPolicy> = {
          pet_types_allowed: policy.pet_types_allowed,
          carrier_requirements: policy.carrier_requirements,
          carrier_requirements_cabin: policy.carrier_requirements_cabin,
          carrier_requirements_cargo: policy.carrier_requirements_cargo,
          documentation_needed: policy.documentation_needed,
          temperature_restrictions: policy.temperature_restrictions,
          breed_restrictions: policy.breed_restrictions,
          policy_url: policy.policy_url,
          size_restrictions: policy.size_restrictions as PetPolicy['size_restrictions'],
          fees: policy.fees as PetPolicy['fees']
        };
        
        decoratedPolicies[policy.airlines.iata_code] = isPetCaddie 
          ? decorateWithPremiumFields(policyData, premiumFields)
          : policyData as PetPolicy;
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

