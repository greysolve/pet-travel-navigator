
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FlightData, PetPolicy } from "./types";
import { useAuth } from "@/contexts/AuthContext";

const COUNTRY_MAPPINGS: Record<string, string> = {
  'USA': 'United States',
  'UK': 'United Kingdom'
};

export const usePetPolicies = (flights: FlightData[]) => {
  const { profile } = useAuth();
  const isPetCaddie = profile?.user_roles?.role === 'pet_caddie';

  return useQuery({
    queryKey: ['petPolicies', flights.map(journey => 
      journey.segments?.map(segment => segment.carrierFsCode)
    ).flat()],
    queryFn: async () => {
      if (!flights.length) return {};
      
      // Get all unique carrier codes from all segments
      const carrierCodes = [...new Set(flights.flatMap(journey => 
        journey.segments?.map(segment => segment.carrierFsCode)
      ))];
      
      console.log("Fetching pet policies for airlines:", carrierCodes);
      console.log("User role:", profile?.user_roles?.role);
      
      const { data: airlines } = await supabase
        .from('airlines')
        .select('id, iata_code')
        .in('iata_code', carrierCodes);

      if (!airlines?.length) return {};

      // If user is a pet caddie, fetch summaries instead of full policies
      if (isPetCaddie) {
        console.log("Fetching pet policy summaries for pet_caddie user");
        const { data: summaries } = await supabase
          .from('pet_policy_summaries')
          .select('summary, airlines!inner(iata_code)')
          .in('airline_id', airlines.map(a => a.id));

        console.log("Found pet policy summaries:", summaries);

        return summaries?.reduce((acc: Record<string, PetPolicy>, record: any) => {
          acc[record.airlines.iata_code] = record.summary;
          return acc;
        }, {}) || {};
      }

      // For other roles, fetch full policies
      console.log("Fetching full pet policies for non-pet_caddie user");
      const { data: policies } = await supabase
        .from('pet_policies')
        .select('*, airlines!inner(iata_code)')
        .in('airline_id', airlines.map(a => a.id));

      console.log("Found pet policies:", policies);

      return policies?.reduce((acc: Record<string, PetPolicy>, policy: any) => {
        acc[policy.airlines.iata_code] = {
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
