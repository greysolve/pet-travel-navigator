
import { BatchProcessor } from '../_shared/BatchProcessor.ts';
import { SupabaseClientManager } from '../_shared/SupabaseClient.ts';
import { AirlineSyncService } from '../_shared/AirlineSyncService.ts';
import { SyncManager } from '../_shared/SyncManager.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let supabase;
  let syncManager;
  let airlineSyncService;

  try {
    console.log('Starting sync_airline_data function...');
    
    // Initialize dependencies
    const supabaseManager = new SupabaseClientManager();
    supabase = await supabaseManager.initialize();
    
    syncManager = new SyncManager(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      'airlines'
    );
    
    const batchProcessor = new BatchProcessor();
    airlineSyncService = new AirlineSyncService(supabase, syncManager, batchProcessor);

    // Parse request
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      requestBody = { mode: 'clear' };
    }
    const { mode = 'clear' } = requestBody;
    
    console.log('Starting airline sync process in mode:', mode);

    if (mode === 'update') {
      const { data: missingPolicies, error: missingPoliciesError } = await supabase
        .from('missing_pet_policies')
        .select('id, iata_code, name');

      if (missingPoliciesError) {
        console.error('Failed to fetch missing policies:', missingPoliciesError);
        throw missingPoliciesError;
      }

      const total = missingPolicies?.length || 0;
      await syncManager.initialize(total);
      console.log(`Initialized sync progress with ${total} airlines to process`);

      // Process airlines in batches
      for (let i = 0; i < (missingPolicies?.length || 0); i += batchProcessor.getBatchSize()) {
        const batch = missingPolicies!.slice(i, i + batchProcessor.getBatchSize());
        console.log(`Processing batch ${Math.floor(i/batchProcessor.getBatchSize()) + 1} of ${Math.ceil((missingPolicies?.length || 0)/batchProcessor.getBatchSize())}`);

        await airlineSyncService.processBatch(batch);

        // Add delay between batches
        if (i + batchProcessor.getBatchSize() < (missingPolicies?.length || 0)) {
          console.log(`Waiting ${batchProcessor.getDelayBetweenBatches()}ms before next batch...`);
          await batchProcessor.delay(batchProcessor.getDelayBetweenBatches());
        }
      }

      const finalProgress = await syncManager.getCurrentProgress();
      const isComplete = finalProgress.processed + finalProgress.error_items.length >= total;
      await syncManager.updateProgress({
        is_complete: isComplete,
        needs_continuation: !isComplete
      });

    } else {
      // Full sync mode
      await airlineSyncService.performFullSync();
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Airlines sync process started successfully'
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );
  } catch (error) {
    console.error('Error in sync_airline_data:', error);
    
    try {
      if (syncManager) {
        await syncManager.updateProgress({
          error_items: ['sync_error'],
          needs_continuation: true,
          is_complete: false
        });
      }
    } catch (e) {
      console.error('Failed to update sync error state:', e);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        errorDetails: error.stack
      }), 
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );
  }
});
