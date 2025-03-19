
/**
 * Type definitions for the pet policy analyzer
 */

export interface Airline {
  id: string;
  name: string;
  iata_code: string;
  policy_url?: string;
  website?: string;
}

export interface ProcessingResult {
  airline_id: string;
  success: boolean;
  iata_code: string;
}

export interface ProcessingError {
  airline_id: string;
  error: string;
  iata_code: string;
}

export interface ProcessingResponse {
  success: boolean;
  results: ProcessingResult[];
  errors: ProcessingError[];
  execution_time: number;
}

export interface PetPolicyData {
  pet_types_allowed: string[];
  carrier_requirements_cabin: string;
  carrier_requirements_cargo: string;
  documentation_needed: string[];
  temperature_restrictions: string;
  breed_restrictions: string[];
  policy_url: string | null;
  official_website?: string | null; // Added to store the main website URL
  size_restrictions: {
    max_weight_cabin: string | null;
    max_weight_cargo: string | null;
    carrier_dimensions_cabin: string | null;
  };
  fees: {
    in_cabin: string | null;
    cargo: string | null;
  };
}
