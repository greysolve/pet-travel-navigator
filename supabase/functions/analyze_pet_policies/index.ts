import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
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

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY')
    if (!PERPLEXITY_API_KEY) {
      throw new Error('Missing Perplexity API key')
    }

    const prompt = `
      Analyze the pet travel policy from this airline's website: ${website}
      First, find the specific URL for the pet travel policy page. Then analyze the policy content.
      Return a JSON object with the following structure. If a field's data is not available, use null:
      {
        "pet_types_allowed": ["string"],
        "carrier_requirements": "string",
        "documentation_needed": ["string"],
        "temperature_restrictions": "string",
        "breed_restrictions": ["string"],
        "policy_url": "string"
      }

      Important: 
      1. Return ONLY valid JSON, no additional text.
      2. For policy_url, provide the complete URL to the specific pet travel policy page.
      3. If you can't find the information, return all fields as null.
      4. Arrays must be properly formatted with square brackets and comma-separated strings.
      5. Do not use trailing commas in arrays or objects.
      6. All strings in arrays must be properly quoted.
      7. Ensure all JSON property names are double-quoted.
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
            content: 'You are a JSON generator that extracts pet policy information from airline websites. Return only valid JSON objects with no additional text.'
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
    console.log('Raw Perplexity API response:', data);

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid API response structure:', data);
      throw new Error('Invalid API response structure');
    }

    let content = data.choices[0].message.content.trim();
    console.log('Raw content to parse:', content);

    let policyData;
    try {
      // First try to extract just the JSON object if there's any surrounding text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in content');
      }
      content = jsonMatch[0];

      // Clean up the JSON string
      content = content
        .replace(/\n/g, ' ') // Remove newlines
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3') // Ensure property names are quoted
        .replace(/:\s*'([^']*)'/g, ':"$1"') // Replace single quotes with double quotes
        .replace(/,\s*,/g, ',') // Remove duplicate commas
        .replace(/\[\s*,/g, '[') // Remove leading comma in arrays
        .replace(/,\s*\]/g, ']') // Remove trailing comma in arrays
        .replace(/"\s+"/g, '","') // Fix spacing between array elements
        .replace(/\[\s*"/g, '["') // Fix spacing at start of arrays
        .replace(/"\s*\]/g, '"]'); // Fix spacing at end of arrays

      console.log('Cleaned JSON string:', content);
      policyData = JSON.parse(content);

      // Normalize the data structure
      const template = {
        pet_types_allowed: null,
        carrier_requirements: null,
        documentation_needed: null,
        temperature_restrictions: null,
        breed_restrictions: null,
        policy_url: null
      };

      // Ensure all fields exist with correct types
      policyData = {
        ...template,
        ...policyData
      };

      // Convert array fields
      ['pet_types_allowed', 'documentation_needed', 'breed_restrictions'].forEach(field => {
        if (policyData[field]) {
          if (typeof policyData[field] === 'string') {
            policyData[field] = [policyData[field]];
          }
          if (Array.isArray(policyData[field])) {
            policyData[field] = policyData[field].map(item => 
              typeof item === 'string' ? item.trim() : String(item).trim()
            ).filter(Boolean);
          }
          if (!Array.isArray(policyData[field]) || policyData[field].length === 0) {
            policyData[field] = null;
          }
        }
      });

      // Convert string fields
      ['carrier_requirements', 'temperature_restrictions', 'policy_url'].forEach(field => {
        if (policyData[field] && typeof policyData[field] !== 'string') {
          policyData[field] = String(policyData[field]).trim();
        }
        if (!policyData[field]) {
          policyData[field] = null;
        }
      });

    } catch (e) {
      console.error('Failed to parse policy data:', e);
      console.error('Content that failed to parse:', content);
      throw new Error(`Failed to parse policy data: ${e.message}`);
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