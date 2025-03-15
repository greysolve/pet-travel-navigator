
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { SyncManager } from '../_shared/SyncManager.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Reduce chunk size further to prevent timeouts
const CHUNK_SIZE = 5;
const DELAY_BETWEEN_AIRLINES = 1000; // 1 second delay between airlines

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`);
    }

    // Get Supabase configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Initialize variables
    let mode = 'clear';
    let offset = 0;
    let resumeToken = null;
    
    // Parse request body
    try {
      const body = await req.text();
      console.log('Received request body:', body);
      
      if (body) {
        const parsedBody = JSON.parse(body);
        console.log('Parsed request body:', parsedBody);
        
        if (parsedBody.mode) mode = parsedBody.mode;
        if (parsedBody.offset) offset = parsedBody.offset;
        if (parsedBody.resumeToken) resumeToken = parsedBody.resumeToken;
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
      throw new Error('Invalid request body');
    }

    console.log(`Starting pet policy analysis - Mode: ${mode}, Offset: ${offset}, ResumeToken: ${resumeToken}`);
    
    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseKey);
    const syncManager = new SyncManager(supabaseUrl, supabaseKey, 'petPolicies');

    // Handle resume token
    if (resumeToken) {
      const currentProgress = await syncManager.getCurrentProgress();
      if (!currentProgress?.needs_continuation) {
        throw new Error('Invalid resume token or no continuation needed');
      }
      console.log('Resuming from previous state:', currentProgress);
    }

    // Get all active airlines query
    const activeAirlinesQuery = supabase.from('airlines').select('*', { count: 'exact' }).eq('active', true);
    
    // Add timestamp filtering if we're in update mode and not doing a full clear
    if (mode === 'update' && mode !== 'clear') {
      // Find airlines where policy doesn't exist or is older than last airline update
      activeAirlinesQuery.or('last_policy_update.is.null,last_policy_update.lt.updated_at');
    }
    
    // Get total count
    const { count: totalCount, error: countError } = await activeAirlinesQuery.select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error getting count:', countError);
      throw new Error(`Error getting count: ${countError.message}`);
    }

    console.log('Total airlines to process:', totalCount);

    if (!totalCount) {
      console.log('No airlines to process');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No airlines to process',
          has_more: false 
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize sync progress
    if (offset === 0) {
      console.log(`Initializing sync progress with total count: ${totalCount}`);
      await syncManager.initialize(totalCount);
    } else {
      // For non-zero offset, validate against existing progress
      const currentProgress = await syncManager.getCurrentProgress();
      if (!currentProgress) {
        throw new Error('No sync progress found for non-zero offset');
      }
      if (currentProgress.total !== totalCount) {
        console.warn(`Total count mismatch. Current: ${currentProgress.total}, New: ${totalCount}. Using existing total.`);
      }
    }

    // Clone the query to get the batch of airlines
    const batchQuery = supabase
      .from('airlines')
      .select('*')
      .eq('active', true)
      .range(offset, offset + CHUNK_SIZE - 1);
      
    // Add the same timestamp filtering if in update mode
    if (mode === 'update' && mode !== 'clear') {
      batchQuery.or('last_policy_update.is.null,last_policy_update.lt.updated_at');
    }
    
    // Get batch of airlines
    const { data: airlines, error: batchError } = await batchQuery;

    if (batchError) {
      console.error('Error fetching airlines batch:', batchError);
      throw batchError;
    }

    if (!airlines || airlines.length === 0) {
      console.log('No more airlines to process');
      await syncManager.updateProgress({ 
        is_complete: true,
        needs_continuation: false
      });
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No more airlines to process',
          has_more: false 
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing chunk of ${airlines.length} airlines`);
    
    const results = [];
    const errors = [];
    const chunkStartTime = Date.now();

    // Process airlines one at a time with delay
    for (const airline of airlines) {
      try {
        console.log(`Processing airline: ${airline.name}`);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/analyze_batch_pet_policies`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ airlines: [airline] }),
        });

        if (!response.ok) {
          throw new Error(`Failed to process airline: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Airline processing result:', result);

        if (result.results?.length > 0) {
          results.push(...result.results);
        }
        if (result.errors?.length > 0) {
          errors.push(...result.errors);
        }

        // Update progress after each airline
        const currentProgress = await syncManager.getCurrentProgress();
        const processedInChunk = results.length + errors.length;
        
        await syncManager.updateProgress({
          processed: currentProgress.processed + 1,
          last_processed: airline.name,
          processed_items: [...(currentProgress.processed_items || []), 
            ...(result.results || []).map((r) => r.iata_code)],
          error_items: [...(currentProgress.error_items || []),
            ...(result.errors || []).map((error) => `${error.iata_code}: ${error.error}`)],
          needs_continuation: true
        });

        // Add delay between airlines
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_AIRLINES));

      } catch (error) {
        console.error('Error processing airline:', airline.name, error);
        errors.push({
          airline_id: airline.id,
          error: error.message,
          iata_code: airline.iata_code
        });
      }
    }

    const nextOffset = offset + airlines.length;
    const hasMore = nextOffset < totalCount;

    // Explicitly set the correct progress state before responding
    await syncManager.updateProgress({ 
      is_complete: !hasMore,
      needs_continuation: hasMore
    });

    const resumeData = hasMore ? {
      offset: nextOffset,
      mode,
      timestamp: new Date().toISOString()
    } : null;
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        errors,
        chunk_metrics: {
          processed: airlines.length,
          execution_time: Date.now() - chunkStartTime,
          success_rate: airlines.length > 0 ? (results.length / airlines.length) * 100 : 0
        },
        has_more: hasMore,
        next_offset: hasMore ? nextOffset : null,
        total_remaining: totalCount - nextOffset,
        resume_token: resumeData ? btoa(JSON.stringify(resumeData)) : null
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fatal error in analyze_pet_policies:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
