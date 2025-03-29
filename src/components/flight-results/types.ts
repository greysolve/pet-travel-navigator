
import type { Json } from "@/integrations/supabase/types";

export type FlightLocation = {
  country?: string;
  code: string;
};

export type FlightSegment = {
  carrierFsCode: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureAirportFsCode: string;
  arrivalAirportFsCode: string;
  departureTerminal?: string;
  arrivalTerminal?: string;
  stops: number;
  elapsedTime: number;
  airlineName?: string;
  isCodeshare: boolean;
  departureCountry?: string;
  arrivalCountry?: string;
  codeshares?: Array<{
    carrierFsCode: string;
    flightNumber: string;
    serviceType: string;
  }>;
};

export type FlightJourney = {
  segments: FlightSegment[];
  totalDuration: number;
  stops: number;
  arrivalCountry?: string;
  origin?: FlightLocation;
  destination?: FlightLocation;
};

export type FlightData = FlightJourney;

export type SizeRestrictions = {
  max_weight_cabin?: string;
  max_weight_cargo?: string;
  carrier_dimensions_cabin?: string;
};

export type Fees = {
  in_cabin?: string;
  cargo?: string;
};

// Define a union type that includes PremiumContent
export type PremiumContent = {
  value: any;
  isPremiumField: true;
};

// Type guard
export function isPremiumContent(value: any): value is PremiumContent {
  return value && typeof value === 'object' && 'isPremiumField' in value;
}

// Define field types that could be premium
export type SizeRestrictionsField = string | SizeRestrictions | PremiumContent;
export type FeesField = string | Fees | PremiumContent;

export type PetPolicy = {
  pet_types_allowed: string[] | PremiumContent;
  carrier_requirements?: string | PremiumContent;
  carrier_requirements_cabin?: string | PremiumContent;
  carrier_requirements_cargo?: string | PremiumContent;
  documentation_needed: string[] | PremiumContent;
  temperature_restrictions?: string | PremiumContent;
  breed_restrictions: string[] | PremiumContent;
  policy_url?: string | PremiumContent;
  size_restrictions?: SizeRestrictionsField;
  fees?: FeesField;
  isSummary?: boolean;
};

export type PolicyType = 'pet_arrival' | 'pet_transit';

export type CountryPolicy = {
  id: string;
  country_code: string;
  policy_type: PolicyType;
  title: string;
  description?: string;
  requirements?: string[];
  documentation_needed?: string[];
  fees?: Json;
  restrictions?: Json;
  quarantine_requirements?: string;
  vaccination_requirements?: string[];
  additional_notes?: string;
  policy_url?: string;
  created_at?: string;
  updated_at?: string;
  all_blood_tests?: string;
  all_other_biological_tests?: string;
  required_ports_of_entry?: string;
};
