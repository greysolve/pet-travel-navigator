
export interface Country {
  name: string;
  code: string;
}

export interface PolicyResult {
  country: string;
  success: boolean;
}

export interface PolicyError {
  country: string;
  error: string;
}

export interface ProcessingResponse {
  success: boolean;
  results: PolicyResult[];
  errors: PolicyError[];
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
