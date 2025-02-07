
export interface AnalysisResponse {
  success: boolean;
  results?: string[];
  errors?: Array<{
    country: string;
    error: string;
  }>;
  chunk_metrics?: {
    processed: number;
    execution_time: number;
    success_rate: number;
  };
  has_more: boolean;
  next_offset?: number;
  total_remaining?: number;
  resume_token?: string | null;
  message?: string;
}

export interface RequestBody {
  mode?: string;
  offset?: number;
  resumeToken?: string | null;
}
