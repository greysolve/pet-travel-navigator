
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
      // Process each airline individually to prevent batch-wide failures
      for (const airline of batch) {
        try {
          console.log(`Processing airline ${airline.name} (${airline.iata_code})`);
          
          // Check if this airline was already processed
          if (currentProgress?.processed_items?.includes(airline.iata_code)) {
            console.log(`Airline ${airline.iata_code} already processed, skipping`);
            continue;
          }

          // Call Perplexity API directly here instead of through another edge function
          const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('PERPLEXITY_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.1-sonar-small-128k-online',
              messages: [
                {
                  role: 'system',
                  content: 'You are a helpful assistant that analyzes airline pet policies and returns the information in a structured format.'
                },
                {
                  role: 'user',
                  content: `Analyze the pet policy for ${airline.name} airline and return a JSON object with the following structure:
                    {
                      "pet_types_allowed": [],
                      "size_restrictions": {
                        "max_weight_cabin": null,
                        "max_weight_cargo": null,
                        "carrier_dimensions_cabin": null
                      },
                      "carrier_requirements_cabin": "",
                      "carrier_requirements_cargo": "",
                      "documentation_needed": [],
                      "fees": {
                        "in_cabin": null,
                        "cargo": null
                      },
                      "temperature_restrictions": "",
                      "breed_restrictions": []
                    }`
                }
              ]
            })
          });

          if (!response.ok) {
            throw new Error(`Perplexity API error: ${response.status}`);
          }

          const analysisData = await response.json();
          const policyContent = analysisData.choices[0].message.content;
          let policyData;
          
          try {
            policyData = JSON.parse(policyContent);
          } catch (parseError) {
            console.error('Error parsing policy data:', parseError);
            throw new Error('Failed to parse policy analysis results');
          }

          // Save the policy data
          const { error: saveError } = await this.supabase
            .from('pet_policies')
            .upsert({
              airline_id: airline.id,
              ...policyData
            }, {
              onConflict: 'airline_id'
            });

          if (saveError) {
            throw new Error(`Failed to save pet policy: ${saveError.message}`);
          }

          results.push({ success: true, iata_code: airline.iata_code });
          await this.updateProgressForAirline(airline.iata_code, true);

        } catch (error) {
          console.error(`Error processing airline ${airline.name}:`, error);
          results.push({ 
            success: false, 
            iata_code: airline.iata_code,
            error: error.message 
          });
          await this.updateProgressForAirline(airline.iata_code, false, error.message);
        }

        // Add delay between individual airlines to prevent rate limiting
        await this.batchProcessor.delay(2000);
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
