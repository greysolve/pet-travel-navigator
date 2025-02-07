
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Country {
  name: string;
  code: string;
}

// Helper function to convert PascalCase/camelCase to snake_case
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

// Helper function to transform policy object keys to snake_case
function transformPolicyKeys(policy: any): any {
  const transformed: any = {};
  Object.entries(policy).forEach(([key, value]) => {
    const snakeCaseKey = toSnakeCase(key);
    transformed[snakeCaseKey] = value;
  });
  return transformed;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  const startTime = Date.now();
  try {
    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityKey) {
      console.error('PERPLEXITY_API_KEY is not set');
      throw new Error('API key configuration error');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Database configuration error');
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { countries } = await req.json();
    if (!Array.isArray(countries)) {
      throw new Error('Invalid input: countries must be an array');
    }

    console.log(`Processing batch of ${countries.length} countries`);
    const results = [];
    const errors = [];

    for (const country of countries) {
      try {
        console.log(`Processing country: ${country.name}`);
        const policies = await analyzePolicies(country, perplexityKey);
        console.log(`Got policies for ${country.name}:`, policies);

        // Store each policy type separately
        for (const policy of policies) {
          // Transform policy keys to snake_case before insertion
          const transformedPolicy = transformPolicyKeys(policy);
          const policyData = {
            country_code: country.code,
            ...transformedPolicy,
            last_updated: new Date().toISOString()
          };

          console.log(`Transformed policy data for ${country.name}:`, policyData);

          const { error: upsertError } = await supabase
            .from('country_policies')
            .upsert(policyData, {
              onConflict: 'country_code,policy_type'
            });

          if (upsertError) {
            throw upsertError;
          }
        }

        results.push({
          country: country.name,
          success: true
        });

        // Add delay between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing ${country.name}:`, error);
        errors.push({
          country: country.name,
          error: error.message
        });
      }
    }

    const executionTime = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        success: true,
        results,
        errors,
        execution_time: executionTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function analyzePolicies(country: Country, perplexityKey: string): Promise<any[]> {
  console.log(`Analyzing policies for country: ${country.name}`);
  
  const systemPrompt = `You are a helpful assistant specializing in finding official government pet and/or live animal import policies. You understand the distinction between arrival policies (for pets entering the country) and transit policies (for pets passing through the country). You prioritize citations you discover from the results that belong to the government of the country you're asked about or the most authoritative citation you can find.
Return ONLY a raw JSON object, with no markdown formatting or explanations.`;
  
  const userPrompt = `For ${country.name}'s pet import and transit requirements:
  1. Search specifically for both:
     - Official requirements for pets ENTERING ${country.name} (arrival policy)
     - Official requirements for pets TRANSITING THROUGH ${country.name} (transit policy)
  2. Use the most authoritative URLs from the results, with strong preference for government websites
  3. Extract complete policy details for both scenarios

  Format as TWO separate JSON objects with this structure, one for each policy type:
  {
    "policy_type": "pet_arrival", // or "pet_transit" for the transit policy
    "title": "string - official name of the policy/requirements",
    "description": "string - comprehensive overview specific to arrival or transit",
    "requirements": ["string - list each and every and test requirement"],
    "all_blood_tests": "string - list all blood, urine and other physical biological tests and their names and required conditions",
    "all_other_biological_tests": "string - list all other physical biological tests and their names and required conditions",
    "documentation_needed": ["string - list each and every document required"],
    "fees": {"description": "string - include all fee details if available"},
    "restrictions": {"description": "string - any limitations or special conditions"},
    "quarantine_requirements": "string - detailed quarantine information",
    "vaccination_requirements": ["string - list each required vaccination"],
    "additional_notes": "string - include source authority and last verified date",
    "required_ports_of_entry": "string - include the airports required and the accompanying conditions",
    "policy_url": "string - MUST be the direct URL to the policy. If using non-government source, explain why in additional_notes"
  }

  Return both policies in an array, even if one type has no specific requirements (in which case, indicate "No specific policy found for this type" in the description).`;

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to get policies from Perplexity API`);
      
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from Perplexity API');
      }

      const content = data.choices[0].message.content.trim();
      console.log('Raw API response:', content);

      try {
        // Clean up the response and parse JSON
        const cleanContent = content
          .replace(/```json\n?|\n?```/g, '')
          .replace(/^\s*\{/, '{')
          .replace(/\}\s*$/, '}')
          .trim();
        
        const policies = JSON.parse(cleanContent);
        return Array.isArray(policies) ? policies : [policies];
      } catch (parseError) {
        console.error('Failed to parse API response:', parseError);
        throw new Error('Invalid policy data format');
      }

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
      }
    }
  }

  throw lastError;
}
