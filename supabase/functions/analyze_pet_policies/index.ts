import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return '';
  }
}

function isValidPolicyUrl(websiteDomain: string, policyUrl: string): boolean {
  const airlineDomain = getDomainFromUrl(websiteDomain);
  const policyDomain = getDomainFromUrl(policyUrl);
  
  if (!airlineDomain || !policyDomain) return false;
  if (policyDomain === airlineDomain) return true;

  const excludedDomains = [
    'rover.com',
    'pettravel.com',
    'alternativeairlines.com',
    'seatmaestro.com',
    'ticketterrier.com',
    'fetchapet.co.uk'
  ];

  return !excludedDomains.includes(policyDomain);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting pet policy and website analysis...');
    
    const body = await req.json();
    console.log('Request body:', body);

    const { airline_id } = body;

    if (!airline_id) {
      throw new Error('Missing required parameter: airline_id');
    }

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('Missing Perplexity API key');
    }

    // First, get the airline name from the database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: airlineData, error: airlineError } = await supabase
      .from('airlines')
      .select('name')
      .eq('id', airline_id)
      .single();

    if (airlineError || !airlineData) {
      throw new Error(`Failed to fetch airline data: ${airlineError?.message || 'Airline not found'}`);
    }

    const prompt = `
      Analyze this airline: ${airlineData.name}
      
      Return a JSON object with these fields (use null if data is not found):
      {
        "airline_info": {
          "official_website": "string (the airline's official website URL, must be complete with https:// and from their own domain)"
        },
        "pet_policy": {
          "pet_types_allowed": ["string"],
          "carrier_requirements": "string",
          "documentation_needed": ["string"],
          "temperature_restrictions": "string",
          "breed_restrictions": ["string"],
          "policy_url": "string (must be from the airline's own website domain)"
        }
      }
      
      IMPORTANT RULES:
      1. The official_website must be the airline's actual website, not a third-party site
      2. The policy_url must be from the airline's own domain
      3. All URLs must start with https:// and be complete
      4. Return null for any field where you're not completely confident of the accuracy
      5. Return ONLY the JSON object, no additional text
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
            content: 'You are a specialized AI focused on finding official airline websites and their pet travel policies. Only return URLs from airlines\' official websites.'
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
      throw new Error('Invalid API response structure');
    }

    let content = data.choices[0].message.content.trim();
    console.log('Raw content to parse:', content);

    // Extract JSON from the content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in content');
    }
    content = jsonMatch[0];

    const parsedData = JSON.parse(content);
    console.log('Parsed data:', parsedData);
    
    // Update airline website if we got a valid one
    if (parsedData.airline_info?.official_website) {
      console.log('Updating airline website:', parsedData.airline_info.official_website);
      const { error: websiteError } = await supabase
        .from('airlines')
        .update({ 
          website: parsedData.airline_info.official_website,
          updated_at: new Date().toISOString()
        })
        .eq('id', airline_id);

      if (websiteError) {
        console.error('Error updating airline website:', websiteError);
      }
    }

    // Process pet policy data
    const policyData = parsedData.pet_policy || {};
    
    // Validate policy URL against the official website
    if (policyData.policy_url && parsedData.airline_info?.official_website) {
      if (!isValidPolicyUrl(parsedData.airline_info.official_website, policyData.policy_url)) {
        console.log(`Invalid policy URL detected: ${policyData.policy_url}`);
        policyData.policy_url = null;
      }
    }

    // Clean and validate arrays
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

    // Clean string fields
    ['carrier_requirements', 'temperature_restrictions'].forEach(field => {
      if (policyData[field] && typeof policyData[field] !== 'string') {
        policyData[field] = String(policyData[field]).trim();
      }
      if (!policyData[field]) {
        policyData[field] = null;
      }
    });

    // Only store policy if we found valid data
    if (policyData.policy_url || policyData.pet_types_allowed || policyData.carrier_requirements) {
      console.log('Storing valid policy data:', policyData);
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
    } else {
      console.log('No valid policy data found, skipping storage');
    }

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