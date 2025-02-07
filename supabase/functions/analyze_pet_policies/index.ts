
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { SyncManager } from '../_shared/SyncManager.ts'
import { corsHeaders } from '../_shared/cors.ts'

const CHUNK_SIZE = 30; // Process 30 airlines per function call

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    let mode = 'clear';
    let offset = 0;
    try {
      const body = await req.text();
      if (body) {
        const { mode: requestMode, offset: requestOffset } = JSON.parse(body);
        if (requestMode) mode = requestMode;
        if (requestOffset) offset = requestOffset;
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
    }

    console.log(`Starting pet policy analysis in mode: ${mode}, offset: ${offset}`);
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const syncManager = new SyncManager(supabaseUrl, supabaseKey, 'petPolicies');

    // Get the total count based on mode
    const { count: totalCount, error: countError } = mode === 'update' 
      ? await supabase.from('missing_pet_policies').select('*', { count: 'exact', head: true })
      : await supabase.from('airlines').select('*', { count: 'exact', head: true }).eq('active', true);

    if (countError) {
      throw new Error(`Error getting count: ${countError.message}`);
    }

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

    // If this is the first chunk (offset = 0), initialize sync progress
    if (offset === 0) {
      console.log(`Initializing sync progress with total count: ${totalCount}`);
      await syncManager.initialize(totalCount);
    } else {
      console.log(`Continuing from offset ${offset}`);
    }

    // Process current chunk
    const { data: airlines, error: batchError } = mode === 'update'
      ? await supabase
          .from('missing_pet_policies')
          .select('*')
          .range(offset, offset + CHUNK_SIZE - 1)
      : await supabase
          .from('airlines')
          .select('*')
          .eq('active', true)
          .range(offset, offset + CHUNK_SIZE - 1);

    if (batchError) {
      console.error('Error fetching airlines batch:', batchError);
      throw batchError;
    }

    if (!airlines || airlines.length === 0) {
      console.log('No more airlines to process');
      await syncManager.updateProgress({ is_complete: true });
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

    // Process airlines in smaller batches within the chunk
    const batchSize = 2;
    for (let i = 0; i < airlines.length; i += batchSize) {
      const batch = airlines.slice(i, i + batchSize);
      try {
        console.log(`Processing batch of ${batch.length} airlines within chunk`);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/analyze_batch_pet_policies`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ airlines: batch }),
        });

        if (!response.ok) {
          throw new Error(`Failed to process batch: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Batch processing result:', result);

        results.push(...result.results);
        if (result.errors) {
          errors.push(...result.errors);
        }

        // Update sync progress after each batch
        const currentProgress = await syncManager.getCurrentProgress();
        const processedInChunk = results.length + errors.length;
        const batchMetrics = {
          avg_time_per_item: (Date.now() - chunkStartTime) / processedInChunk,
          estimated_time_remaining: ((Date.now() - chunkStartTime) / processedInChunk) * (totalCount - offset - processedInChunk),
          success_rate: (results.length / processedInChunk) * 100
        };

        await syncManager.updateProgress({
          processed: currentProgress.processed + batch.length,
          last_processed: batch[batch.length - 1].name,
          processed_items: [...(currentProgress.processed_items || []), 
            ...result.results.map((r: any) => r.iata_code)],
          error_items: [...(currentProgress.error_items || []),
            ...(result.errors || []).map((error: any) => `${error.iata_code}: ${error.error}`)],
          batch_metrics: batchMetrics
        });

        // Add delay between batches
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error('Error processing batch:', error);
        errors.push(...batch.map(airline => ({
          airline_id: airline.id,
          error: error.message,
          iata_code: airline.iata_code
        })));
      }
    }

    const nextOffset = offset + airlines.length;
    const hasMore = nextOffset < totalCount;

    if (!hasMore) {
      await syncManager.updateProgress({ is_complete: true });
    }

    const chunkExecutionTime = Date.now() - chunkStartTime;
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        errors,
        chunk_metrics: {
          processed: airlines.length,
          execution_time: chunkExecutionTime,
          success_rate: (results.length / airlines.length) * 100
        },
        has_more: hasMore,
        next_offset: hasMore ? nextOffset : null,
        total_remaining: totalCount - nextOffset
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
