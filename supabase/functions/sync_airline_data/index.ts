
import { BatchProcessor } from '../_shared/BatchProcessor.ts';
import { SupabaseClientManager } from '../_shared/SupabaseClient.ts';
import { AirlineSyncService } from '../_shared/AirlineSyncService.ts';
import { SyncManager } from '../_shared/SyncManager.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  // Log the incoming request for debugging
  console.log('Received request:', {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    url: req.url
  });

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Initialize service variables in outer scope
  let supabase;
  let syncManager;
  let airlineSyncService;
  let batchProcessor;

  try {
    console.log('Starting sync_airline_data function...');
    
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.log('Failed to parse request body:', error);
      requestBody = { mode: 'clear' };
    }
    const { mode = 'clear', resumeToken, offset = 0 } = requestBody;
    
    console.log('Starting airline sync process:', { mode, resumeToken, offset });

    // Initialize each service separately with detailed error handling
    try {
      const supabaseManager = new SupabaseClientManager();
      supabase = await supabaseManager.initialize();
      console.log('Supabase client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      throw new Error(`Supabase initialization failed: ${error.message}`);
    }

    try {
      syncManager = new SyncManager(supabase, 'airlines');
      console.log('Sync manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Sync Manager:', error);
      throw new Error(`Sync Manager initialization failed: ${error.message}`);
    }

    try {
      console.log('Initializing BatchProcessor...');
      batchProcessor = new BatchProcessor(30000, 3, 3, 2000);
      console.log('BatchProcessor initialized successfully:', {
        timeout: batchProcessor.getTimeout(),
        batchSize: batchProcessor.getBatchSize(),
        delay: batchProcessor.getDelayBetweenBatches()
      });
    } catch (error) {
      console.error('Failed to initialize BatchProcessor:', error);
      throw new Error(`BatchProcessor initialization failed: ${error.message}`);
    }

    try {
      airlineSyncService = new AirlineSyncService(supabase, syncManager, batchProcessor);
      console.log('Airline sync service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AirlineSyncService:', error);
      throw new Error(`AirlineSyncService initialization failed: ${error.message}`);
    }

    // Get total count of airlines to process
    const { data: missingPolicies, error: missingPoliciesError } = await supabase
      .from('missing_pet_policies')
      .select('id, iata_code, name');

    if (missingPoliciesError) {
      console.error('Failed to fetch missing policies:', missingPoliciesError);
      throw missingPoliciesError;
    }

    const total = missingPolicies?.length || 0;
    console.log(`Total airlines to process: ${total}`);

    // Get current progress or initialize if starting fresh
    const currentProgress = await syncManager.getCurrentProgress();
    
    // Initialize progress only if:
    // 1. No current progress exists OR
    // 2. Not resuming and mode is 'clear'
    if (!currentProgress || (!resumeToken && mode === 'clear')) {
      console.log('Initializing new sync progress');
      await syncManager.initialize(total);
    } else {
      console.log('Resuming from previous progress:', currentProgress);
    }

    // Add verification check for BatchProcessor before entering processing loop
    if (!batchProcessor || typeof batchProcessor.getBatchSize !== 'function') {
      throw new Error('BatchProcessor not properly initialized before processing loop');
    }

    // Only process a limited number of airlines per invocation
    const maxProcessingTime = 120000; // 120 seconds (leaving 30s buffer)
    const startTime = Date.now();
    let processedInThisInvocation = 0;
    let currentOffset = offset;

    console.log(`Starting processing from offset: ${currentOffset}`);

    while (currentOffset < total) {
      // Check if we're approaching the timeout
      if (Date.now() - startTime > maxProcessingTime) {
        console.log('Approaching timeout limit, will continue in next invocation');
        break;
      }

      const batchSize = batchProcessor.getBatchSize();
      const batch = missingPolicies!.slice(currentOffset, currentOffset + batchSize);
      
      if (batch.length === 0) break;

      console.log(`Processing batch at offset ${currentOffset}, batch size: ${batch.length}`);
      const batchResult = await airlineSyncService.processBatch(batch);
      console.log('Batch result:', batchResult);

      processedInThisInvocation += batch.length;
      currentOffset += batch.length;

      // Add delay between batches
      if (currentOffset < total) {
        await batchProcessor.delay(batchProcessor.getDelayBetweenBatches());
      }
    }

    // Get latest progress for the update
    const latestProgress = await syncManager.getCurrentProgress();
    const needsContinuation = currentOffset < total;
    const lastProcessed = missingPolicies![currentOffset - 1]?.iata_code;

    console.log('Updating progress:', {
      processed: latestProgress.processed + processedInThisInvocation,
      needsContinuation,
      lastProcessed,
      currentOffset
    });

    // Update progress
    await syncManager.updateProgress({
      processed: latestProgress.processed + processedInThisInvocation,
      needs_continuation: needsContinuation,
      is_complete: !needsContinuation,
      last_processed: lastProcessed
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: needsContinuation ? 'Batch processed successfully, more remaining' : 'All airlines processed successfully',
        progress: {
          ...latestProgress,
          processed: latestProgress.processed + processedInThisInvocation,
          needs_continuation: needsContinuation,
          next_offset: currentOffset,
          last_processed: lastProcessed
        }
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
