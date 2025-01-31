import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Airline {
  name: string;
  iata_code: string;
  website?: string;
  country?: string;
}

const BATCH_SIZE = 50; // Process airlines in batches

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

    console.log('Fetching airlines from Cirium API...')
    
    const response = await fetch(
      'https://api.flightstats.com/flex/airlines/rest/v1/json/active',
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
    const airlines: Airline[] = data.airlines
      .filter((airline: any) => airline.iata) // Only process airlines with IATA codes
      .map((airline: any) => ({
        name: airline.name,
        iata_code: airline.iata,
        website: airline.website || null,
        country: airline.country || null,
      }))

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`Processing ${airlines.length} airlines in batches of ${BATCH_SIZE}...`)

    // Process airlines in batches
    const batches = [];
    for (let i = 0; i < airlines.length; i += BATCH_SIZE) {
      batches.push(airlines.slice(i, i + BATCH_SIZE));
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const [index, batch] of batches.entries()) {
      console.log(`Processing batch ${index + 1} of ${batches.length}...`);
      
      try {
        const { error } = await supabase
          .from('airlines')
          .upsert(
            batch.map(airline => ({
              ...airline,
              active: true,
              updated_at: new Date().toISOString(),
            })),
            { onConflict: 'iata_code' }
          )

        if (error) {
          console.error(`Error in batch ${index + 1}:`, error)
          errorCount++
        } else {
          processedCount += batch.length
        }

        // Add a small delay between batches
        if (index < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`Failed to process batch ${index + 1}:`, error)
        errorCount++
      }
    }

    const summary = {
      success: true,
      total: airlines.length,
      processed: processedCount,
      errors: errorCount,
    }

    console.log('Sync complete:', summary)

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})