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
  title: string;
  description?: string;
  requirements?: string[];
  documentation_needed?: string[];
  vaccination_requirements?: string[];
  quarantine_requirements?: string;
  additional_notes?: string;
  policy_url?: string;
  policy_type: PolicyType;
};