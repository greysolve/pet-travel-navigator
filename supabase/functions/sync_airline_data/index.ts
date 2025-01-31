import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // First, fetch airlines
    console.log('Fetching airlines...')
    const fetchAirlinesResponse = await fetch(
      `${supabaseUrl}/functions/v1/fetch_airlines`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    )

    if (!fetchAirlinesResponse.ok) {
      throw new Error('Failed to fetch airlines')
    }

    // Then, analyze pet policies for airlines with websites
    const { data: airlines, error: fetchError } = await supabase
      .from('airlines')
      .select('id, website')
      .not('website', 'is', null)

    if (fetchError) {
      throw fetchError
    }

    console.log(`Analyzing pet policies for ${airlines.length} airlines...`)

    for (const airline of airlines) {
      if (!airline.website) continue

      await fetch(`${supabaseUrl}/functions/v1/analyze_pet_policies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          airline_id: airline.id,
          website: airline.website,
        }),
      })

      // Add a small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
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