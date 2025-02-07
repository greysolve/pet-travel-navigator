
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { SyncManager } from '../_shared/SyncManager.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
async function handleCorsRequest(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      },
    })
  }
}

Deno.serve(async (req) => {
  try {
    // Handle CORS
    const corsResponse = await handleCorsRequest(req);
    if (corsResponse) return corsResponse;

    // Parse request body with error handling
    let mode = 'clear'; // Default mode
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
      // Continue with default mode if parsing fails
    }

    console.log('Starting pet policy analysis in mode:', mode);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const syncManager = new SyncManager(supabaseUrl, supabaseKey, 'petPolicies');

    let airlinesQuery;
    if (mode === 'update') {
      console.log('Fetching airlines with missing policies...');
      airlinesQuery = await supabase
        .from('missing_pet_policies')
        .select('*');
    } else {
      console.log('Fetching all active airlines...');
      airlinesQuery = await supabase
        .from('airlines')
        .select('*')
        .eq('active', true);
    }

    if (airlinesQuery.error) {
      throw airlinesQuery.error;
    }

    const airlines = airlinesQuery.data || [];
    console.log(`Found ${airlines.length} airlines to process`);

    // Initialize sync progress
    await syncManager.initialize(airlines.length, false);

    // Process airlines in batches
    const batchSize = 3;
    for (let i = 0; i < airlines.length; i += batchSize) {
      const batch = airlines.slice(i, i + batchSize);
      
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
        await syncManager.updateProgress({
          processed: (await syncManager.getCurrentProgress())?.processed + batch.length || batch.length,
          last_processed: batch[batch.length - 1].name,
          processed_items: [...((await syncManager.getCurrentProgress())?.processed_items || []), 
            ...batch.map(airline => airline.name)],
          error_items: [...((await syncManager.getCurrentProgress())?.error_items || []),
            ...(result.errors || []).map((error: any) => `${error.iata_code}: ${error.error}`)]
        });

      } catch (error) {
        console.error('Error processing batch:', error);
        await syncManager.updateProgress({
          error_items: [...((await syncManager.getCurrentProgress())?.error_items || []),
            ...batch.map(airline => `${airline.name}: ${error.message}`)]
        });
      }

      // Add delay between batches
      if (i + batchSize < airlines.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Mark sync as complete
    await syncManager.completeSync();

    return new Response(
      JSON.stringify({ success: true }), 
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
