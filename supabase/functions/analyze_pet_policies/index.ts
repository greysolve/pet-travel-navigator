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
      First, find the specific URL for the pet travel policy page. Then analyze the policy content.
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
        },
        "policy_url": string | null
      }

      Important: 
      1. Make sure to return ONLY the JSON object, no additional text or formatting.
      2. For policy_url, provide the complete URL to the specific pet travel policy page, not just the main website.
      3. If you can't find the information, return the JSON with all null values.
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
            content: 'You are a JSON generator that extracts pet policy information from airline websites, with special focus on finding the specific URL for pet travel policies. Return only valid JSON objects.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      console.error('Perplexity API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw Perplexity API response:', data);

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid API response structure:', data);
      throw new Error('Invalid API response structure');
    }

    const content = data.choices[0].message.content.trim();
    console.log('Content to parse:', content);

    let policyData;
    try {
      // First try direct JSON parse
      try {
        policyData = JSON.parse(content);
      } catch (e) {
        // If direct parse fails, try to extract JSON from the content
        console.log('Direct JSON parse failed, attempting to extract JSON from content');
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error('No JSON object found in content');
          throw new Error('No JSON object found in content');
        }
        const jsonString = jsonMatch[0];
        console.log('Extracted JSON string:', jsonString);
        policyData = JSON.parse(jsonString);
      }

      if (!policyData || typeof policyData !== 'object') {
        throw new Error('Invalid policy data structure');
      }

      // Ensure all required fields exist with correct types
      const defaultPolicy = {
        pet_types_allowed: null,
        size_restrictions: {
          cabin_max_weight_kg: null,
          cargo_max_weight_kg: null
        },
        carrier_requirements: null,
        documentation_needed: null,
        breed_restrictions: null,
        temperature_restrictions: null,
        fees: {
          cabin_fee: null,
          cargo_fee: null
        },
        policy_url: null
      };

      // Merge with default policy to ensure all fields exist
      policyData = {
        ...defaultPolicy,
        ...policyData,
        size_restrictions: {
          ...defaultPolicy.size_restrictions,
          ...policyData.size_restrictions
        },
        fees: {
          ...defaultPolicy.fees,
          ...policyData.fees
        }
      };

    } catch (e) {
      console.error('Failed to parse policy data:', e);
      console.error('Raw content:', content);
      throw new Error('Failed to parse policy data from AI response');
    }

    // Store in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Storing policy data in Supabase:', policyData);
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