import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting pet policy analysis...');
    
    let body;
    try {
      body = await req.json();
      console.log('Request body:', body);
    } catch (e) {
      console.error('Failed to parse request body:', e);
      throw new Error('Invalid request body');
    }

    const { airline_id, website } = body;

    if (!airline_id || !website) {
      throw new Error('Missing required parameters: airline_id and website are required');
    }

    console.log(`Analyzing pet policy for airline ${airline_id} from ${website}`);

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('Missing Perplexity API key');
    }

    const prompt = `
      Analyze the pet travel policy from this airline's website: ${website}
      
      IMPORTANT: For the policy_url field:
      1. Search specifically for a dedicated pet/animal travel policy page
      2. If no dedicated page exists, find the most relevant page containing pet policy information
      3. If the policy is part of a larger document, provide the URL to that document
      4. Only return null if absolutely no relevant URL can be found
      5. The URL must be complete (including https://) and directly accessible
      
      Return a JSON object with ONLY these fields (use null if data is not found):
      {
        "pet_types_allowed": ["string"],
        "carrier_requirements": "string",
        "documentation_needed": ["string"],
        "temperature_restrictions": "string",
        "breed_restrictions": ["string"],
        "policy_url": "string"
      }
      
      Rules:
      1. Return ONLY valid JSON, no other text
      2. All arrays must be properly formatted with square brackets
      3. All strings must be properly quoted
      4. Empty arrays should be null, not []
      5. All property names must be exactly as shown above
      6. Do not add any additional fields
      7. No trailing commas
      8. For policy_url, provide the most specific and relevant URL possible
    `;

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
            content: 'You are a specialized AI focused on finding and extracting pet travel policies from airline websites. Your primary goal is to locate specific policy URLs and detailed policy information.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error('Perplexity API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Perplexity API response:', data);

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid API response structure:', data);
      throw new Error('Invalid API response structure');
    }

    let content = data.choices[0].message.content.trim();
    console.log('Raw content to parse:', content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in content');
    }
    content = jsonMatch[0];

    let policyData;
    try {
      policyData = JSON.parse(content);
      
      const requiredFields = [
        'pet_types_allowed',
        'carrier_requirements',
        'documentation_needed',
        'temperature_restrictions',
        'breed_restrictions',
        'policy_url'
      ];

      for (const field of requiredFields) {
        if (!(field in policyData)) {
          policyData[field] = null;
        }
      }

      ['pet_types_allowed', 'documentation_needed', 'breed_restrictions'].forEach(field => {
        if (!Array.isArray(policyData[field])) {
          policyData[field] = policyData[field] ? [String(policyData[field])] : null;
        } else if (policyData[field].length === 0) {
          policyData[field] = null;
        } else {
          policyData[field] = policyData[field].map(item => String(item).trim()).filter(Boolean);
          if (policyData[field].length === 0) {
            policyData[field] = null;
          }
        }
      });

      ['carrier_requirements', 'temperature_restrictions', 'policy_url'].forEach(field => {
        if (policyData[field] && typeof policyData[field] !== 'string') {
          policyData[field] = String(policyData[field]).trim();
        }
        if (!policyData[field]) {
          policyData[field] = null;
        }
      });

      // Validate policy URL format if one is provided
      if (policyData.policy_url) {
        try {
          new URL(policyData.policy_url);
        } catch (e) {
          console.warn(`Invalid policy URL format: ${policyData.policy_url}`);
          policyData.policy_url = null;
        }
      }

    } catch (e) {
      console.error('Failed to parse policy data:', e);
      console.error('Content that failed to parse:', content);
      throw new Error(`Failed to parse policy data: ${e.message}`);
    }

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
      }, { 
        onConflict: 'airline_id'
      });

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