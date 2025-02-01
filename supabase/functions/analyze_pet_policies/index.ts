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
  // Get base domains
  const airlineDomain = getDomainFromUrl(websiteDomain);
  const policyDomain = getDomainFromUrl(policyUrl);
  
  if (!airlineDomain || !policyDomain) return false;

  // Check if policy domain matches airline domain
  if (policyDomain === airlineDomain) return true;

  // List of known third-party booking/info sites we want to exclude
  const excludedDomains = [
    'rover.com',
    'pettravel.com',
    'alternativeairlines.com',
    'seatmaestro.com',
    'ticketterrier.com',
    'fetchapet.co.uk'
  ];

  // Reject if policy is from a known third-party site
  if (excludedDomains.includes(policyDomain)) return false;

  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting pet policy analysis...');
    
    const body = await req.json();
    console.log('Request body:', body);

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
      1. Search ONLY for official pet/animal travel policy pages on ${website}
      2. Do NOT return URLs from third-party websites or blogs
      3. The URL must be from the airline's own domain
      4. Return null if no official policy page is found
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
            content: 'You are a specialized AI focused on finding and extracting pet travel policies from airline websites. Your primary goal is to locate specific policy URLs and detailed policy information. Only return URLs from the airline\'s official website.'
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

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in content');
    }
    content = jsonMatch[0];

    let policyData = JSON.parse(content);
    
    // Validate policy URL
    if (policyData.policy_url && !isValidPolicyUrl(website, policyData.policy_url)) {
      console.log(`Invalid policy URL detected: ${policyData.policy_url} for website ${website}`);
      policyData.policy_url = null;
    }

    // Clean and validate other fields
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

    ['carrier_requirements', 'temperature_restrictions'].forEach(field => {
      if (policyData[field] && typeof policyData[field] !== 'string') {
        policyData[field] = String(policyData[field]).trim();
      }
      if (!policyData[field]) {
        policyData[field] = null;
      }
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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