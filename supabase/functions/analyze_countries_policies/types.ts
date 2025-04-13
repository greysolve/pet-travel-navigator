
export interface Country {
  id: string;
  name: string;
  code: string;
}

export interface ProcessingError {
  country: string;
  error: string;
}

export interface CountryPolicyResult {
  country: string;
  processingTimeMs: number;
  policiesFound: number;
  policiesSaved?: string[];
}
