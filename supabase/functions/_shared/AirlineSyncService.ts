
import { SyncManager } from './SyncManager.ts';
import { BatchProcessor } from './BatchProcessor.ts';
import { SupabaseClientManager } from './SupabaseClient.ts';

interface AirlineSync {
  id: string;
  iata_code: string;
  name: string;
}

interface SyncResult {
  success: boolean;
  iata_code: string;
  error?: string;
}

export class AirlineSyncService {
  private supabase;
  private syncManager;
  private batchProcessor;

  constructor(supabase: any, syncManager: SyncManager, batchProcessor: BatchProcessor) {
    this.supabase = supabase;
    this.syncManager = syncManager;
    this.batchProcessor = batchProcessor;
  }

  async processBatch(batch: AirlineSync[]) {
    console.log(`Processing batch of ${batch.length} airlines`);
    
    const results: SyncResult[] = [];
    const currentProgress = await this.syncManager.getCurrentProgress();
    
    try {
      // Process the batch using analyze_batch_pet_policies
      console.log('Calling analyze_batch_pet_policies with batch:', batch);
      const { data: analysisResult, error: analysisError } = await this.supabase.functions.invoke(
        'analyze_batch_pet_policies',
        {
          body: { airlines: batch }
        }
      );

      if (analysisError) {
        throw new Error(`Batch analysis failed: ${analysisError.message}`);
      }

      console.log('Batch analysis results:', analysisResult);

      // Update progress based on results
      for (const airline of batch) {
        const result = analysisResult.results?.find(r => r.airline_id === airline.id);
        const error = analysisResult.errors?.find(e => e.airline_id === airline.id);

        if (result) {
          results.push({ success: true, iata_code: airline.iata_code });
          await this.updateProgressForAirline(airline.iata_code, true);
        } else if (error) {
          results.push({ 
            success: false, 
            iata_code: airline.iata_code,
            error: error.error 
          });
          await this.updateProgressForAirline(airline.iata_code, false, error.error);
        }
      }

      return { 
        success: results.some(r => r.success),
        results: results.filter(r => r.success),
        errors: results.filter(r => !r.success)
      };

    } catch (error) {
      console.error('Error processing batch:', error);
      // Update progress with batch-wide error
      for (const airline of batch) {
        await this.updateProgressForAirline(
          airline.iata_code, 
          false, 
          `Batch processing failed: ${error.message}`
        );
      }
      throw error;
    }
  }

  private async updateProgressForAirline(iataCode: string, success: boolean, errorMessage?: string) {
    const currentProgress = await this.syncManager.getCurrentProgress();
    if (!currentProgress) return;

    const updates: any = {
      processed: currentProgress.processed + 1,
      last_processed: iataCode
    };

    if (success) {
      updates.processed_items = [...(currentProgress.processed_items || []), iataCode];
    } else {
      updates.error_items = [...(currentProgress.error_items || []), iataCode];
      updates.error_details = {
        ...(currentProgress.error_details || {}),
        [iataCode]: errorMessage
      };
    }

    await this.syncManager.updateProgress(updates);
  }

  async performFullSync() {
    try {
      console.log('Starting full airline sync');
      
      // Get total count of active airlines
      const { count, error: countError } = await this.supabase
        .from('airlines')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);

      if (countError) throw countError;
      
      console.log(`Found ${count} active airlines to process`);
      await this.syncManager.initialize(count);

      // Fetch and process airlines in batches
      let processed = 0;
      const batchSize = this.batchProcessor.getBatchSize();

      while (processed < count) {
        const { data: airlines, error } = await this.supabase
          .from('airlines')
          .select('id, iata_code, name')
          .eq('active', true)
          .range(processed, processed + batchSize - 1);

        if (error) throw error;
        if (!airlines?.length) break;

        await this.processBatch(airlines);
        processed += airlines.length;

        // Add delay between batches
        if (processed < count) {
          await this.batchProcessor.delay(this.batchProcessor.getDelayBetweenBatches());
        }
      }

      const finalProgress = await this.syncManager.getCurrentProgress();
      await this.syncManager.updateProgress({
        is_complete: true,
        needs_continuation: false
      });

      return { success: true, processed };
    } catch (error) {
      console.error('Error in full sync:', error);
      await this.syncManager.updateProgress({
        error_items: ['full_sync'],
        needs_continuation: true,
        is_complete: false,
        error_details: {
          full_sync: error.message
        }
      });
      throw error;
    }
  }
}
