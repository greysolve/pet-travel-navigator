
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

export type PetPolicy = {
  pet_types_allowed: string[];
  carrier_requirements: string;
  documentation_needed: string[];
  temperature_restrictions: string;
  breed_restrictions: string[];
  policy_url?: string;
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
