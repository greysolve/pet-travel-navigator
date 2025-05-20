
import { supabase } from '@/integrations/supabase/client';
import { SyncType } from '@/types/sync';

export async function getCurrentSyncProgress(syncType: keyof typeof SyncType) {
  try {
    const { data: syncProgress } = await supabase
      .from('sync_progress')
      .select('*')
      .eq('type', syncType)
      .single();
      
    return syncProgress;
  } catch (error) {
    console.log('Error fetching current sync progress', error);
    return null;
  }
}

export function prepareSmartUpdateOptions(specificAirlines: string[], batchSize: number) {
  if (specificAirlines.length > batchSize) {
    return {
      airlines: specificAirlines.slice(0, batchSize),
      message: `Found ${specificAirlines.length} airlines needing updates. Processing the first ${batchSize} now.`
    };
  }
  return {
    airlines: specificAirlines,
    message: null
  };
}
