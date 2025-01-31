import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Airport {
  iata_code: string;
  name: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

const BATCH_SIZE = 50; // Process 50 airports at a time

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const CIRIUM_APP_ID = Deno.env.get('CIRIUM_APP_ID')
    const CIRIUM_APP_KEY = Deno.env.get('CIRIUM_APP_KEY')
    
    if (!CIRIUM_APP_ID || !CIRIUM_APP_KEY) {
      throw new Error('Missing Cirium API credentials')
    }

    console.log('Fetching airports from Cirium API...')
    
    const response = await fetch(
      'https://api.flightstats.com/flex/airports/rest/v1/json/active',
      {
        headers: {
          'appId': CIRIUM_APP_ID,
          'appKey': CIRIUM_APP_KEY,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Cirium API error: ${response.statusText}`)
    }

    const data = await response.json()
    const airports: Airport[] = data.airports
      .filter((airport: any) => airport.iata) // Only process airports with IATA codes
      .map((airport: any) => ({
        iata_code: airport.iata,
        name: airport.name,
        city: airport.city || null,
        country: airport.countryName || null,
        latitude: airport.latitude || null,
        longitude: airport.longitude || null,
        timezone: airport.timeZoneRegionName || null,
      }));

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`Processing ${airports.length} airports in batches of ${BATCH_SIZE}...`)

    // Process airports in batches
    const batches = [];
    for (let i = 0; i < airports.length; i += BATCH_SIZE) {
      batches.push(airports.slice(i, i + BATCH_SIZE));
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const [index, batch] of batches.entries()) {
      console.log(`Processing batch ${index + 1} of ${batches.length}...`);
      
      try {
        const { error } = await supabase
          .from('airports')
          .upsert(
            batch.map(airport => ({
              ...airport,
              updated_at: new Date().toISOString(),
            })),
            { onConflict: 'iata_code' }
          );

        if (error) {
          console.error(`Error in batch ${index + 1}:`, error);
          errorCount++;
        } else {
          processedCount += batch.length;
        }

        // Add a small delay between batches to prevent rate limiting
        if (index < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Failed to process batch ${index + 1}:`, error);
        errorCount++;
      }
    }

    const summary = {
      total: airports.length,
      processed: processedCount,
      errors: errorCount,
      success: processedCount > 0
    };

    console.log('Sync complete:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})