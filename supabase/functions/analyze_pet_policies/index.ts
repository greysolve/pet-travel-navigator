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
    const { airline_id, website } = await req.json()
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY')

    if (!PERPLEXITY_API_KEY) {
      throw new Error('Missing Perplexity API key')
    }

    console.log(`Analyzing pet policy for airline ${airline_id} from ${website}`)

    const prompt = `
      Analyze the pet travel policy from this airline's website: ${website}
      Return a JSON object with the following structure:
      {
        "pet_types_allowed": string[],
        "size_restrictions": {
          "cabin_max_weight_kg": number,
          "cargo_max_weight_kg": number
        },
        "carrier_requirements": string,
        "documentation_needed": string[],
        "breed_restrictions": string[],
        "temperature_restrictions": string,
        "fees": {
          "cabin_fee": string,
          "cargo_fee": string
        }
      }
    `

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Extract and structure airline pet policy information.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.statusText}`)
    }

    const data = await response.json()
    const policyData = JSON.parse(data.choices[0].message.content)

    // Store in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error } = await supabase
      .from('pet_policies')
      .upsert({
        airline_id,
        ...policyData,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'airline_id' })

    if (error) {
      throw error
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