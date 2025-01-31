import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get all airlines
    const { data: airlines, error: airlinesError } = await supabase
      .from('airlines')
      .select('id, name');

    if (airlinesError) {
      throw new Error(`Error fetching airlines: ${airlinesError.message}`);
    }

    console.log(`Found ${airlines.length} airlines to process`);

    // Process airlines in batches
    const batchSize = 5;
    const results = {
      success: 0,
      failed: 0,
      total: airlines.length,
    };

    for (let i = 0; i < airlines.length; i += batchSize) {
      const batch = airlines.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}...`);

      for (const airline of batch) {
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
            console.error(`Failed to insert route for airline ${airline.name}: ${insertError.message}`);
            results.failed++;
          } else {
            results.success++;
          }
        } catch (error) {
          console.error(`Error processing airline ${airline.name}: ${error.message}`);
          results.failed++;
        }
      }

      // Add a small delay between batches to prevent rate limiting
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