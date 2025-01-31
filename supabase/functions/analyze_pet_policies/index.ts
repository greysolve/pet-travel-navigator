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
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
      throw new Error('Invalid request body');
    }

    const { airline_id, website } = body;

    if (!airline_id || !website) {
      throw new Error('Missing required parameters: airline_id and website are required');
    }

    console.log(`Analyzing pet policy for airline ${airline_id} from ${website}`);

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY')
    if (!PERPLEXITY_API_KEY) {
      throw new Error('Missing Perplexity API key')
    }

    const prompt = `
      Analyze the pet travel policy from this airline's website: ${website}
      Return a JSON object with the following structure. If a field's data is not available, use null:
      {
        "pet_types_allowed": string[] | null,
        "size_restrictions": {
          "cabin_max_weight_kg": number | null,
          "cargo_max_weight_kg": number | null
        },
        "carrier_requirements": string | null,
        "documentation_needed": string[] | null,
        "breed_restrictions": string[] | null,
        "temperature_restrictions": string | null,
        "fees": {
          "cabin_fee": string | null,
          "cargo_fee": string | null
        }
      }
    `

    console.log('Sending request to Perplexity API...');
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
            content: 'Extract and structure airline pet policy information into valid JSON format.'
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
      console.error('Perplexity API error:', response.status, response.statusText);
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Perplexity API response:', data);

    let policyData;
    try {
      policyData = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      console.error('Failed to parse policy data:', e);
      console.error('Raw content:', data.choices[0].message.content);
      throw new Error('Failed to parse policy data from AI response');
    }

    // Store in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Storing policy data in Supabase...');
    const { error } = await supabase
      .from('pet_policies')
      .upsert({
        airline_id,
        ...policyData,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'airline_id' });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Successfully stored policy data');
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});