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
  fees?: Record<string, any>;
  restrictions?: Record<string, any>;
  quarantine_requirements?: string;
  vaccination_requirements?: string[];
  additional_notes?: string;
  last_updated?: string;
  policy_url?: string;
};