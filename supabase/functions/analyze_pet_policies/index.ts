
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { SyncManager } from '../_shared/SyncManager.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    let mode = 'clear';
    try {
      const body = await req.text();
      if (body) {
        const { mode: requestMode } = JSON.parse(body);
        if (requestMode) {
          mode = requestMode;
        }
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
    }

    console.log('Starting pet policy analysis in mode:', mode);
    
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
        JSON.stringify({ success: true, message: 'No airlines to process' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Total airlines to process: ${totalCount}`);

    // Initialize sync progress with actual count
    await syncManager.initialize(totalCount);

    // Process airlines in smaller batches
    const batchSize = 2; // Process 2 at a time
    let processedCount = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    while (processedCount < totalCount && consecutiveErrors < maxConsecutiveErrors) {
      console.log(`Processing batch starting at offset ${processedCount}`);

      const { data: airlines, error: batchError } = mode === 'update'
        ? await supabase
            .from('missing_pet_policies')
            .select('*')
            .range(processedCount, processedCount + batchSize - 1)
        : await supabase
            .from('airlines')
            .select('*')
            .eq('active', true)
            .range(processedCount, processedCount + batchSize - 1);

      if (batchError) {
        console.error('Error fetching airlines batch:', batchError);
        consecutiveErrors++;
        continue;
      }

      if (!airlines || airlines.length === 0) {
        console.log('No more airlines to process');
        break;
      }

      try {
        console.log(`Processing batch of ${airlines.length} airlines`);
        
        const response = await fetch(`${supabaseUrl}/functions/v1/analyze_batch_pet_policies`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ airlines }),
        });

        if (!response.ok) {
          throw new Error(`Failed to process batch: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Batch processing result:', result);

        // Update sync progress with batch metrics
        const currentProgress = await syncManager.getCurrentProgress();
        const batchMetrics = {
          avg_time_per_item: result.execution_time / airlines.length,
          estimated_time_remaining: (result.execution_time / airlines.length) * (totalCount - processedCount - airlines.length),
          success_rate: (result.results.length / airlines.length) * 100
        };

        await syncManager.updateProgress({
          processed: currentProgress.processed + airlines.length,
          last_processed: airlines[airlines.length - 1].name,
          processed_items: [...(currentProgress.processed_items || []), 
            ...result.results.map((r: any) => r.iata_code)],
          error_items: [...(currentProgress.error_items || []),
            ...(result.errors || []).map((error: any) => `${error.iata_code}: ${error.error}`)],
          batch_metrics: batchMetrics
        });

        consecutiveErrors = 0; // Reset error counter on success
        processedCount += airlines.length;

      } catch (error) {
        console.error('Error processing batch:', error);
        consecutiveErrors++;
        
        const currentProgress = await syncManager.getCurrentProgress();
        await syncManager.updateProgress({
          error_items: [...(currentProgress.error_items || []),
            ...airlines.map(airline => `${airline.iata_code}: ${error.message}`)]
        });

        // Add delay before retry
        const retryDelay = Math.min(1000 * Math.pow(2, consecutiveErrors), 10000);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      // Add delay between batches
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const finalProgress = await syncManager.getCurrentProgress();
    const isComplete = finalProgress.processed + finalProgress.error_items.length >= totalCount;
    
    await syncManager.updateProgress({
      is_complete: isComplete,
      needs_continuation: !isComplete
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        totalProcessed: processedCount,
        isComplete
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
