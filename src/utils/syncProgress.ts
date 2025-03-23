import { supabase } from "@/integrations/supabase/client";
import { SyncType } from "@/types/sync";

export interface SyncState {
  total: number;
  processed: number;
  lastProcessed: string | null;
  processedItems: string[];
  errorItems: string[];
  startTime: string;
  isComplete: boolean;
}

export async function initializeSyncProgress(type: SyncType, total: number): Promise<void> {
  console.log(`Initializing sync progress for ${type}`);
  const { error } = await supabase
    .from('sync_progress')
    .upsert({
      type,
      total,
      processed: 0,
      last_processed: null,
      processed_items: [],
      error_items: [],
      start_time: new Date().toISOString(),
      is_complete: false
    }, {
      onConflict: 'type'
    });

  if (error) {
    console.error(`Error initializing sync progress for ${type}:`, error);
    throw error;
  }
}

export async function updateSyncProgress(
  type: SyncType, 
  updates: Partial<SyncState>
): Promise<void> {
  console.log(`Updating sync progress for ${type}:`, updates);
  
  const { error } = await supabase
    .from('sync_progress')
    .upsert({
      type,
      total: updates.total,
      processed: updates.processed,
      last_processed: updates.lastProcessed,
      processed_items: updates.processedItems,
      error_items: updates.errorItems,
      start_time: updates.startTime,
      is_complete: updates.isComplete
    }, {
      onConflict: 'type'
    });

  if (error) {
    console.error(`Error updating sync progress for ${type}:`, error);
    throw error;
  }
}

export async function getSyncProgress(type: SyncType): Promise<SyncState | null> {
  console.log(`Fetching sync progress for ${type}`);
  
  const { data, error } = await supabase
    .from('sync_progress')
    .select('*')
    .eq('type', type)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No progress found
    }
    console.error(`Error fetching sync progress for ${type}:`, error);
    throw error;
  }

  return {
    total: data.total,
    processed: data.processed,
    lastProcessed: data.last_processed,
    processedItems: data.processed_items || [],
    errorItems: data.error_items || [],
    startTime: data.start_time,
    isComplete: data.is_complete
  };
}
