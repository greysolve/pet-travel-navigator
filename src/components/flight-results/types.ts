export type FlightData = {
  carrierFsCode: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  arrivalCountry?: string;
  airlineName?: string;
  connections?: FlightData[];
  totalDuration?: number;
  stops?: number;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTerminal?: string;
  arrivalTerminal?: string;
};

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