
export interface Airline {
  id: string;
  name: string;
  iata_code: string;
  website?: string;
  last_policy_update?: string;
}

export interface ProcessingResult {
  airline_id: string;
  iata_code: string;
  success: boolean;
  content_changed?: boolean;
}

export interface ProcessingError {
  airline_id: string;
  iata_code: string;
  error: string;
}

export interface ProcessingResponse {
  success: boolean;
  results: ProcessingResult[];
  errors: ProcessingError[];
  execution_time: number;
  raw_api_response?: string;
  content_changed?: boolean;
  comparison_details?: any;
}
