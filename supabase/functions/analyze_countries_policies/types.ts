
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

export interface ApiResponse {
  data: {
    progress: {
      needs_continuation: boolean;
      next_offset: number | null;
    };
    results?: CountryPolicyResult[];
    errors?: ProcessingError[];
    chunk_metrics?: {
      processed: number;
      execution_time: number;
      success_rate: number;
    };
  };
  error?: string;
}
