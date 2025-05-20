
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

// Extend FlightJourney to include the fields used in the application
// Removing conflicting origin/destination string definitions
export type FlightData = FlightJourney & {
  id?: string;
  departure_date?: string;
  airline_id?: string;
  airline_code?: string;
  airline_name?: string;
  flight_number?: string;
  departure_time?: string;
  arrival_time?: string;
  duration?: string;
  price?: number;
  isPolicySearch?: boolean;
  // Add originCode and destinationCode as string helpers, instead of redefining origin/destination
  originCode?: string;
  destinationCode?: string;
};

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
  size_restrictions?: SizeRestrictionsField; // Deprecated - kept for backward compatibility
  fees?: FeesField;
  
  // New specific size restriction fields
  cabin_max_weight_kg?: number | null;
  cabin_combined_weight_kg?: number | null;
  cabin_length_cm?: number | null;
  cabin_width_cm?: number | null;
  cabin_height_cm?: number | null;
  cabin_linear_dimensions_cm?: number | null;
  cargo_max_weight_kg?: number | null;
  cargo_combined_weight_kg?: number | null;
  cargo_length_cm?: number | null;
  cargo_width_cm?: number | null;
  cargo_height_cm?: number | null;
  cargo_linear_dimensions_cm?: number | null;
  weight_includes_carrier?: boolean | null;
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
