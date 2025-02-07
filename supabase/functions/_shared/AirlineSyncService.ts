
import { SyncManager } from './SyncManager.ts';
import { BatchProcessor } from './BatchProcessor.ts';
import { SupabaseClientManager } from './SupabaseClient.ts';

export class AirlineSyncService {
  private supabase;
  private syncManager;
  private batchProcessor;

  constructor(supabase: any, syncManager: SyncManager, batchProcessor: BatchProcessor) {
    this.supabase = supabase;
    this.syncManager = syncManager;
    this.batchProcessor = batchProcessor;
  }

  async processBatch(batch: any[]) {
    console.log(`Processing batch of ${batch.length} airlines`);
    
    try {
      const { data: result, error } = await this.batchProcessor.retryOperation(async () => {
        return await this.supabase.functions.invoke('analyze_batch_pet_policies', {
          body: { airlines: batch }
        });
      });

      if (error) throw error;
      if (!result) throw new Error('No result returned from analyze_batch_pet_policies');

      const currentProgress = await this.syncManager.getCurrentProgress();
      
      const batchUpdate = {
        processed: currentProgress.processed + result.results.length,
        processed_items: [
          ...currentProgress.processed_items,
          ...result.results.map(success => success.iata_code)
        ],
        error_items: [
          ...currentProgress.error_items,
          ...result.errors.map(error => error.iata_code)
        ],
        last_processed: result.results[result.results.length - 1]?.iata_code || currentProgress.last_processed
      };

      console.log(`Updating progress with ${result.results.length} successes and ${result.errors.length} errors`);
      await this.syncManager.updateProgress(batchUpdate);

      if (result.results.length > 0) {
        await this.removeProcessedAirlines(result.results.map(success => success.iata_code));
      }

      return { success: true, processedCount: result.results.length };
    } catch (error) {
      console.error(`Failed to process batch:`, error);
      const currentProgress = await this.syncManager.getCurrentProgress();
      await this.syncManager.updateProgress({
        error_items: [
          ...currentProgress.error_items,
          ...batch.map(airline => airline.iata_code)
        ],
        needs_continuation: true
      });
      return { success: false, error };
    }
  }

  private async removeProcessedAirlines(successfulIataCodes: string[]) {
    console.log(`Removing ${successfulIataCodes.length} processed items from missing_pet_policies`);
    const { error: deleteError } = await this.supabase
      .from('missing_pet_policies')
      .delete()
      .in('iata_code', successfulIataCodes);

    if (deleteError) {
      console.error('Error removing processed items from missing_pet_policies:', deleteError);
    }
  }

  async performFullSync() {
    try {
      console.log('Starting full airline sync');
      await this.syncManager.initialize(1);

      const { data: result, error } = await this.batchProcessor.retryOperation(async () => {
        return await this.supabase.functions.invoke('fetch_airlines', {
          body: {}
        });
      });

      if (error) throw error;
      if (!result) throw new Error('No result returned from fetch_airlines');

      console.log('Fetch airlines result:', result);
      
      await this.syncManager.updateProgress({
        processed: 1,
        last_processed: 'Full sync completed',
        processed_items: ['full_sync'],
        is_complete: true,
        needs_continuation: false
      });

      return { success: true };
    } catch (error) {
      console.error('Error in full sync:', error);
      await this.syncManager.updateProgress({
        error_items: ['full_sync'],
        needs_continuation: true,
        is_complete: false
      });
      throw error;
    }
  }
}
