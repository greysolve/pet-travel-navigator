import { supabase } from "@/integrations/supabase/client";
import { SyncType, SyncProgress } from "@/types/sync";

export async function initializeSyncProgress(type: SyncType, total: number): Promise<void> {
  console.log(`Initializing sync progress for ${type} with total: ${total}`);
  
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
  updates: Partial<SyncProgress>
): Promise<void> {
  console.log(`Updating sync progress for ${type}:`, updates);
  
  const { error } = await supabase
    .from('sync_progress')
    .upsert({
      type,
      ...updates,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'type'
    });

  if (error) {
    console.error(`Error updating sync progress for ${type}:`, error);
    throw error;
  }
}

export async function getSyncProgress(type: SyncType): Promise<SyncProgress | null> {
  console.log(`Fetching sync progress for ${type}`);
  
  const { data, error } = await supabase
    .from('sync_progress')
    .select('*')
    .eq('type', type)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
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

export async function getAllActiveSyncs(): Promise<Record<SyncType, SyncProgress>> {
  console.log('Fetching all active syncs');
  
  const { data, error } = await supabase
    .from('sync_progress')
    .select('*')
    .eq('is_complete', false);

  if (error) {
    console.error('Error fetching active syncs:', error);
    throw error;
  }

  return data.reduce((acc: Record<SyncType, SyncProgress>, curr) => {
    acc[curr.type as SyncType] = {
      total: curr.total,
      processed: curr.processed,
      lastProcessed: curr.last_processed,
      processedItems: curr.processed_items || [],
      errorItems: curr.error_items || [],
      startTime: curr.start_time,
      isComplete: curr.is_complete
    };
    return acc;
  }, {} as Record<SyncType, SyncProgress>);
}
