
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FlightData, PetPolicy, SizeRestrictionsField, FeesField } from "./types";
import { useProfile } from "@/contexts/profile/ProfileContext";
import { decorateWithPremiumFields } from "@/utils/policyDecorator";
import { usePremiumFields } from "@/hooks/usePremiumFields";
import { getSearchCountries } from "../search/search-utils/policyCalculations";

const COUNTRY_MAPPINGS: Record<string, string> = {
  'USA': 'United States',
  'UK': 'United Kingdom'
};

export const useSingleAirlinePolicy = (airlineIataCode: string) => {
  const { profile } = useProfile();
  const isPetCaddie = profile ? profile.userRole === 'pet_caddie' : false;
  const { data: premiumFields = [] } = usePremiumFields();

  return useQuery({
    queryKey: ['singleAirlinePolicy', airlineIataCode, premiumFields],
    queryFn: async () => {
      if (!airlineIataCode) return null;

      console.log("Fetching pet policy for airline IATA:", airlineIataCode);

      const { data: airline, error: airlineError } = await supabase
        .from('airlines')
        .select('id, iata_code, name')
        .eq('iata_code', airlineIataCode)
        .maybeSingle();

      if (airlineError || !airline?.id) {
        console.error("Error finding airline:", airlineError);
        return null;
      }

      const { data: policy, error: policyError } = await supabase
        .from('pet_policies')
        .select(`
          *,
          cabin_max_weight_kg,
          cabin_combined_weight_kg,
          cabin_length_cm,
          cabin_width_cm,
          cabin_height_cm,
          cabin_linear_dimensions_cm,
          cargo_max_weight_kg,
          cargo_combined_weight_kg,
          cargo_length_cm,
          cargo_width_cm,
          cargo_height_cm,
          cargo_linear_dimensions_cm,
          weight_includes_carrier
        `)
        .eq('airline_id', airline.id)
        .maybeSingle();

      if (policyError) {
        console.error("Error fetching pet policy:", policyError);
        return null;
      }

      if (!policy) return null;

      const policyData: Partial<PetPolicy> = {
        pet_types_allowed: policy.pet_types_allowed,
        carrier_requirements: policy.carrier_requirements,
        carrier_requirements_cabin: policy.carrier_requirements_cabin,
        carrier_requirements_cargo: policy.carrier_requirements_cargo,
        documentation_needed: policy.documentation_needed,
        temperature_restrictions: policy.temperature_restrictions,
        breed_restrictions: policy.breed_restrictions,
        policy_url: policy.policy_url,
        size_restrictions: policy.size_restrictions as SizeRestrictionsField,
        fees: policy.fees as FeesField,
        
        // Include the specific size restriction fields
        cabin_max_weight_kg: policy.cabin_max_weight_kg,
        cabin_combined_weight_kg: policy.cabin_combined_weight_kg,
        cabin_length_cm: policy.cabin_length_cm,
        cabin_width_cm: policy.cabin_width_cm,
        cabin_height_cm: policy.cabin_height_cm,
        cabin_linear_dimensions_cm: policy.cabin_linear_dimensions_cm,
        cargo_max_weight_kg: policy.cargo_max_weight_kg,
        cargo_combined_weight_kg: policy.cargo_combined_weight_kg,
        cargo_length_cm: policy.cargo_length_cm,
        cargo_width_cm: policy.cargo_width_cm,
        cargo_height_cm: policy.cargo_height_cm,
        cargo_linear_dimensions_cm: policy.cargo_linear_dimensions_cm,
        weight_includes_carrier: policy.weight_includes_carrier
      };

      return isPetCaddie
        ? decorateWithPremiumFields(policyData, premiumFields)
        : policyData as PetPolicy;
    },
    enabled: !!airlineIataCode,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
};

export const usePetPolicies = (flights: FlightData[]) => {
  const { profile } = useProfile();
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
        .select(`
          *,
          cabin_max_weight_kg,
          cabin_combined_weight_kg,
          cabin_length_cm,
          cabin_width_cm,
          cabin_height_cm,
          cabin_linear_dimensions_cm,
          cargo_max_weight_kg,
          cargo_combined_weight_kg,
          cargo_length_cm,
          cargo_width_cm,
          cargo_height_cm,
          cargo_linear_dimensions_cm,
          weight_includes_carrier,
          airlines!inner(iata_code)
        `)
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
          size_restrictions: policy.size_restrictions as SizeRestrictionsField,
          fees: policy.fees as FeesField,
          
          // Include the specific size restriction fields
          cabin_max_weight_kg: policy.cabin_max_weight_kg,
          cabin_combined_weight_kg: policy.cabin_combined_weight_kg,
          cabin_length_cm: policy.cabin_length_cm,
          cabin_width_cm: policy.cabin_width_cm,
          cabin_height_cm: policy.cabin_height_cm,
          cabin_linear_dimensions_cm: policy.cabin_linear_dimensions_cm,
          cargo_max_weight_kg: policy.cargo_max_weight_kg,
          cargo_combined_weight_kg: policy.cargo_combined_weight_kg,
          cargo_length_cm: policy.cargo_length_cm,
          cargo_width_cm: policy.cargo_width_cm,
          cargo_height_cm: policy.cargo_height_cm,
          cargo_linear_dimensions_cm: policy.cargo_linear_dimensions_cm,
          weight_includes_carrier: policy.weight_includes_carrier
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

export const useCountryPolicies = (flights: FlightData[]) => {
  return useQuery({
    queryKey: ['countryPolicies', flights],
    queryFn: async () => {
      if (!flights.length) {
        console.log("No flights provided");
        return [];
      }
      
      // Get standardized country codes from airport IATA codes
      const countryCodeArray = await getSearchCountries(flights);
      
      if (!countryCodeArray.length) {
        console.log("No countries found in flights data");
        return [];
      }
      
      console.log(`Looking up policies for countries:`, countryCodeArray);
      
      const { data: policies, error } = await supabase
        .from('country_policies')
        .select('*')
        .in('country_code', countryCodeArray)
        .in('policy_type', ['pet_arrival', 'pet_transit']);

      if (error) {
        console.error("Error fetching country policies:", error);
        return [];
      }

      console.log(`Found ${policies?.length || 0} policies:`, policies);
      return policies || [];
    },
    enabled: flights.length > 0,
    retry: 3,
    retryDelay: 2000,
  });
};
