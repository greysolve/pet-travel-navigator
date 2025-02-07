
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

    // First, get the total count
    const countQuery = mode === 'update' 
      ? await supabase.from('missing_pet_policies').select('id', { count: 'exact', head: true })
      : await supabase.from('airlines').select('id', { count: 'exact', head: true }).eq('active', true);

    if (countQuery.error) {
      throw new Error(`Error getting count: ${countQuery.error.message}`);
    }

    const totalCount = countQuery.count || 0;
    console.log(`Total airlines to process: ${totalCount}`);

    // Initialize sync progress with actual count
    await syncManager.initialize(totalCount);

    // Get airlines in smaller batches
    const batchSize = 50; // Process 50 at a time for the main query
    let processedCount = 0;

    while (processedCount < totalCount) {
      const airlinesQuery = mode === 'update'
        ? await supabase
            .from('missing_pet_policies')
            .select('*')
            .range(processedCount, processedCount + batchSize - 1)
        : await supabase
            .from('airlines')
            .select('*')
            .eq('active', true)
            .range(processedCount, processedCount + batchSize - 1);

      if (airlinesQuery.error) {
        console.error('Error fetching airlines batch:', airlinesQuery.error);
        throw airlinesQuery.error;
      }

      const airlines = airlinesQuery.data || [];
      if (airlines.length === 0) break;

      console.log(`Processing batch of ${airlines.length} airlines`);

      // Process airlines in smaller sub-batches
      const processingBatchSize = 2; // Reduced batch size for API calls
      for (let i = 0; i < airlines.length; i += processingBatchSize) {
        const batch = airlines.slice(i, i + processingBatchSize);
        
        try {
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

          // Update sync progress
          const currentProgress = await syncManager.getCurrentProgress();
          await syncManager.updateProgress({
            processed: currentProgress.processed + batch.length,
            last_processed: batch[batch.length - 1].name,
            processed_items: [...(currentProgress.processed_items || []), 
              ...batch.map(airline => airline.name)],
            error_items: [...(currentProgress.error_items || []),
              ...(result.errors || []).map((error: any) => `${error.iata_code}: ${error.error}`)]
          });

        } catch (error) {
          console.error('Error processing batch:', error);
          const currentProgress = await syncManager.getCurrentProgress();
          await syncManager.updateProgress({
            error_items: [...(currentProgress.error_items || []),
              ...batch.map(airline => `${airline.name}: ${error.message}`)]
          });
        }

        // Add delay between sub-batches
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      processedCount += airlines.length;
    }

    await syncManager.completeSync();

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

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
