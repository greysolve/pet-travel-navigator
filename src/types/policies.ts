export interface CountryPolicy {
  id: string;
  country_code: string;
  policy_type: string;
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
}