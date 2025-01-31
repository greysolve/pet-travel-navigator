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
    const airlines: Airline[] = data.airlines.map((airline: any) => ({
      name: airline.name,
      iata_code: airline.iata,
      website: airline.website || null,
      country: airline.country || null,
    }))

    // Insert into Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`Processing ${airlines.length} airlines...`)

    for (const airline of airlines) {
      const { error } = await supabase
        .from('airlines')
        .upsert(
          {
            name: airline.name,
            iata_code: airline.iata_code,
            website: airline.website,
            country: airline.country,
            active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'iata_code' }
        )

      if (error) {
        console.error(`Error inserting airline ${airline.name}:`, error)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
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