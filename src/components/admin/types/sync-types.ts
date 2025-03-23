
import { SyncType } from "@/types/sync";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface SyncProgressDB {
  id: string;
  type: string;
  total: number;
  processed: number;
  last_processed: string | null;
  processed_items: string[];
  error_items: string[];
  start_time: string | null;
  is_complete: boolean;
  needs_continuation: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ActiveSyncsProps {
  syncProgress: Record<string, {
    total: number;
    processed: number;
    isComplete: boolean;
    needsContinuation?: boolean;
  }>;
}
