import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting route sync process...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // First clear existing routes to prevent duplicates
    console.log('Clearing existing routes...');
    const { error: clearError } = await supabase
      .from('routes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (clearError) {
      console.error('Error clearing routes:', clearError);
      throw new Error(`Failed to clear existing routes: ${clearError.message}`);
    }

    // Get all active airlines
    console.log('Fetching airlines...');
    const { data: airlines, error: airlinesError } = await supabase
      .from('airlines')
      .select('id, name')
      .eq('active', true);

    if (airlinesError) {
      console.error('Error fetching airlines:', airlinesError);
      throw new Error(`Error fetching airlines: ${airlinesError.message}`);
    }

    if (!airlines || airlines.length === 0) {
      console.log('No active airlines found');
      return new Response(
        JSON.stringify({
          message: 'No active airlines found to process',
          results: { success: 0, failed: 0, total: 0 }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Found ${airlines.length} airlines to process`);

    // Process airlines in smaller batches to prevent timeouts
    const batchSize = 3;
    const results = {
      success: 0,
      failed: 0,
      total: airlines.length,
    };

    for (let i = 0; i < airlines.length; i += batchSize) {
      const batch = airlines.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(airlines.length / batchSize)}...`);

      const routePromises = batch.map(async (airline) => {
        try {
          // Sample route data - in a real scenario, you might fetch this from an API
          const routeData = {
            airline_id: airline.id,
            departure_country: 'United States',
            arrival_country: 'Canada',
            policy_variations: {
              seasonal_restrictions: true,
              requires_health_certificate: true
            }
          };

          const { error: insertError } = await supabase
            .from('routes')
            .insert(routeData);

          if (insertError) {
            console.error(`Failed to insert route for airline ${airline.name}:`, insertError);
            results.failed++;
            return false;
          }

          console.log(`Successfully created route for airline: ${airline.name}`);
          results.success++;
          return true;
        } catch (error) {
          console.error(`Error processing airline ${airline.name}:`, error);
          results.failed++;
          return false;
        }
      });

      // Wait for all promises in the current batch
      await Promise.all(routePromises);

      // Add a small delay between batches
      if (i + batchSize < airlines.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('Route sync completed:', results);

    return new Response(
      JSON.stringify({
        message: 'Route sync completed successfully',
        results
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );

  } catch (error) {
    console.error('Error in route sync:', error);
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});