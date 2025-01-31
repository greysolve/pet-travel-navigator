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
    const airports: Airport[] = data.airports.map((airport: any) => ({
      iata_code: airport.iata,
      name: airport.name,
      city: airport.city || null,
      country: airport.countryName || null,
      latitude: airport.latitude || null,
      longitude: airport.longitude || null,
      timezone: airport.timeZoneRegionName || null,
    }))

    // Insert into Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`Processing ${airports.length} airports...`)

    for (const airport of airports) {
      const { error } = await supabase
        .from('airports')
        .upsert(
          {
            iata_code: airport.iata_code,
            name: airport.name,
            city: airport.city,
            country: airport.country,
            latitude: airport.latitude,
            longitude: airport.longitude,
            timezone: airport.timezone,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'iata_code' }
        )

      if (error) {
        console.error(`Error inserting airport ${airport.name}:`, error)
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