
import { BatchProcessor } from '../_shared/BatchProcessor.ts';
import { SupabaseClientManager } from '../_shared/SupabaseClient.ts';
import { AirlineSyncService } from '../_shared/AirlineSyncService.ts';
import { SyncManager } from '../_shared/SyncManager.ts';

// Enhanced CORS headers to explicitly allow lovableproject.com
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400', // 24 hours cache for preflight requests
};

Deno.serve(async (req) => {
  // Log the incoming request for debugging
  console.log('Received request:', {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    url: req.url
  });

  // Enhanced OPTIONS handling for preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response(null, {
      status: 204, // No content
      headers: corsHeaders
    });
  }

  let supabase;
  let syncManager;
  let airlineSyncService;

  try {
    console.log('Starting sync_airline_data function...');
    
    // Parse request with validation
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.log('Failed to parse request body, defaulting to clear mode:', error);
      requestBody = { mode: 'clear' };
    }
    const { mode = 'clear', resumeToken } = requestBody;
    
    console.log('Starting airline sync process in mode:', mode, 'resumeToken:', resumeToken);
    
    // Initialize dependencies with enhanced error handling
    try {
      const supabaseManager = new SupabaseClientManager();
      supabase = await supabaseManager.initialize();
      
      syncManager = new SyncManager(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        'airlines'
      );
      
      // Adjusted timeouts and batch size for reliability
      const batchProcessor = new BatchProcessor(45000, 3, 5, 3000);
      airlineSyncService = new AirlineSyncService(supabase, syncManager, batchProcessor);
    } catch (error) {
      console.error('Failed to initialize services:', error);
      throw new Error(`Service initialization failed: ${error.message}`);
    }

    if (mode === 'update') {
      // Get current progress if resuming
      let currentProgress;
      if (resumeToken) {
        currentProgress = await syncManager.getCurrentProgress();
        if (!currentProgress?.needs_continuation) {
          throw new Error('Invalid resume token or no continuation needed');
        }
      }

      // Fetch missing policies with enhanced error handling
      const { data: missingPolicies, error: missingPoliciesError } = await supabase
        .from('missing_pet_policies')
        .select('id, iata_code, name');

      if (missingPoliciesError) {
        console.error('Failed to fetch missing policies:', missingPoliciesError);
        throw missingPoliciesError;
      }

      const total = missingPolicies?.length || 0;
      if (!resumeToken) {
        await syncManager.initialize(total);
      }
      console.log(`${resumeToken ? 'Resuming' : 'Initialized'} sync progress with ${total} airlines to process`);

      // Process airlines in batches with enhanced logging
      for (let i = 0; i < (missingPolicies?.length || 0); i += batchProcessor.getBatchSize()) {
        const batch = missingPolicies!.slice(i, i + batchProcessor.getBatchSize());
        console.log(`Processing batch ${Math.floor(i/batchProcessor.getBatchSize()) + 1} of ${Math.ceil((missingPolicies?.length || 0)/batchProcessor.getBatchSize())}`);

        const batchResult = await airlineSyncService.processBatch(batch);
        console.log('Batch processing result:', batchResult);

        if (i + batchProcessor.getBatchSize() < (missingPolicies?.length || 0)) {
          console.log(`Waiting ${batchProcessor.getDelayBetweenBatches()}ms before next batch...`);
          await batchProcessor.delay(batchProcessor.getDelayBetweenBatches());
        }
      }

      const finalProgress = await syncManager.getCurrentProgress();
      const isComplete = finalProgress.processed >= total;
      await syncManager.updateProgress({
        is_complete: isComplete,
        needs_continuation: !isComplete
      });

    } else {
      // Full sync mode with enhanced logging
      await airlineSyncService.performFullSync();
    }

    const currentProgress = await syncManager.getCurrentProgress();
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Airlines sync process completed successfully',
        progress: currentProgress
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
          is_complete: false,
          error_details: {
            sync_error: error.message
          }
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

