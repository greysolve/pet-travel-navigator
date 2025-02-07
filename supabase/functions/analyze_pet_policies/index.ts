
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { SyncManager } from '../_shared/SyncManager.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Reduce chunk size to prevent timeouts
const CHUNK_SIZE = 10;

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
    let resumeToken = null;
    
    try {
      const body = await req.text();
      if (body) {
        const { mode: requestMode, offset: requestOffset, resumeToken: requestToken } = JSON.parse(body);
        if (requestMode) mode = requestMode;
        if (requestOffset) offset = requestOffset;
        if (requestToken) resumeToken = requestToken;
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
      throw new Error('Invalid request body');
    }

    console.log(`Starting pet policy analysis in mode: ${mode}, offset: ${offset}, resumeToken: ${resumeToken}`);
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const syncManager = new SyncManager(supabaseUrl, supabaseKey, 'petPolicies');

    if (resumeToken) {
      const currentProgress = await syncManager.getCurrentProgress();
      if (!currentProgress || currentProgress.needs_continuation !== true) {
        throw new Error('Invalid resume token or no continuation needed');
      }
      console.log('Resuming from previous state:', currentProgress);
    }

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

    if (offset === 0) {
      console.log(`Initializing sync progress with total count: ${totalCount}`);
      await syncManager.initialize(totalCount);
    }

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

    // Process airlines one at a time to prevent timeouts
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
        const batchMetrics = {
          avg_time_per_item: (Date.now() - chunkStartTime) / processedInChunk,
          estimated_time_remaining: ((Date.now() - chunkStartTime) / processedInChunk) * (totalCount - offset - processedInChunk),
          success_rate: (results.length / processedInChunk) * 100
        };

        await syncManager.updateProgress({
          processed: currentProgress.processed + 1,
          last_processed: airline.name,
          processed_items: [...(currentProgress.processed_items || []), 
            ...(result.results || []).map((r: any) => r.iata_code)],
          error_items: [...(currentProgress.error_items || []),
            ...(result.errors || []).map((error: any) => `${error.iata_code}: ${error.error}`)],
          batch_metrics: batchMetrics,
          needs_continuation: true
        });

        // Add small delay between airlines to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

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

    if (!hasMore) {
      await syncManager.updateProgress({ 
        is_complete: true,
        needs_continuation: false
      });
    }

    const chunkExecutionTime = Date.now() - chunkStartTime;
    
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
          execution_time: chunkExecutionTime,
          success_rate: (results.length / airlines.length) * 100
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

