
// Types needed for the analyze_pet_policies function

export interface Airline {
  id: string;
  name: string;
  iata_code: string;
  website?: string;
}

export interface Country {
  id: string;
  name: string;
  code: string;
}

export interface CountryPolicyResult {
  country: string;
  processingTimeMs: number;
  policiesFound: number;
  policiesSaved?: string[];
}

export interface ProcessingError {
  country: string;
  error: string;
}

export interface ProcessingResponse {
  success: boolean;
  results: CountryPolicyResult[];
  errors: ProcessingError[];
  execution_time?: number;
}

export interface Policy {
  policy_type: string;
  country_code: string;
  title: string;
  description?: string;
  requirements?: string[];
  all_blood_tests?: string;
  all_other_biological_tests?: string;
  documentation_needed?: string[];
  fees?: { description: string };
  restrictions?: { description: string };
  quarantine_requirements?: string;
  vaccination_requirements?: string[];
  additional_notes?: string;
  required_ports_of_entry?: string;
  policy_url?: string;
  last_updated: string;
}
