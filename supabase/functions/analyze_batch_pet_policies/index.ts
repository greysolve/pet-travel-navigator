
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'

interface Airline {
  id: string;
  name: string;
  iata_code: string;
  policy_url?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const startTime = Date.now();
  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OPENAI_API_KEY is not set');
      throw new Error('API key configuration error');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Database configuration error');
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { airlines } = await req.json();
    if (!Array.isArray(airlines)) {
      throw new Error('Invalid input: airlines must be an array');
    }

    console.log(`Processing batch of ${airlines.length} airlines`);
    const results = [];
    const errors = [];

    for (const airline of airlines) {
      try {
        console.log(`Processing airline: ${airline.name}`);
        const petPolicy = await analyzePetPolicy(airline, openaiKey);
        
        const policyData = {
          airline_id: airline.id,
          ...petPolicy,
          policy_url: airline.policy_url || petPolicy.policy_url
        };
        
        const { error: upsertError } = await supabase
          .from('pet_policies')
          .upsert(policyData, {
            onConflict: 'airline_id'
          });

        if (upsertError) {
          throw upsertError;
        }

        if (petPolicy.policy_url && !airline.policy_url) {
          const { error: airlineError } = await supabase
            .from('airlines')
            .update({ website: petPolicy.policy_url })
            .eq('id', airline.id);

          if (airlineError) {
            console.error(`Error updating airline website: ${airlineError.message}`);
          }
        }

        // Remove from missing_pet_policies if present
        if (airline.policy_url) {
          const { error: deleteError } = await supabase
            .from('missing_pet_policies')
            .delete()
            .eq('iata_code', airline.iata_code);

          if (deleteError) {
            console.error(`Error removing from missing_pet_policies: ${deleteError.message}`);
          }
        }

        results.push({
          airline_id: airline.id,
          success: true,
          iata_code: airline.iata_code
        });

        // Add delay between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing ${airline.name}:`, error);
        errors.push({
          airline_id: airline.id,
          error: error.message,
          iata_code: airline.iata_code
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

async function analyzePetPolicy(airline: Airline, openaiKey: string): Promise<any> {
  console.log(`Analyzing pet policy for airline: ${airline.name}`);
  
  const systemPrompt = `You are a helpful assistant specializing in analyzing airline pet policies. You prioritize finding official policies from airline websites and documents. Focus on extracting key information about pet travel requirements and restrictions.
Do not ruminate or demonstrate your thought process into the chat. 
Return ONLY a raw JSON object, with no markdown formatting or explanations.`;
  
  const userMessage = `Analyze this airline's pet policy and return a JSON object with the following information for ${airline.name}. The response must be ONLY the JSON object, no markdown formatting or additional text:
  {
    "airline_info": {
      "official_website": "url if found"
    },
    "pet_policy": {
      "pet_types_allowed": ["list of allowed pets, specify if in cabin or cargo"],
      "size_restrictions": {
        "max_weight_cabin": "weight in kg/lbs",
        "max_weight_cargo": "weight in kg/lbs",
        "carrier_dimensions_cabin": "size limits"
      },
      "carrier_requirements_cabin": "description of carrier requirements for cabin travel",
      "carrier_requirements_cargo": "description of carrier requirements for cargo travel",
      "documentation_needed": ["list each and every required document"],
      "fees": {
        "in_cabin": "fee amount",
        "cargo": "fee amount"
      },
      "temperature_restrictions": "description of any temperature related restrictions",
      "breed_restrictions": ["list of restricted breeds"]
    }
  }

  Search specifically for:
  1. What pets are allowed in cabin vs cargo
  2. Size and weight limits for both cabin and cargo
  3. Specific carrier requirements for both cabin and cargo
  4. All required documentation and health certificates
  5. Fees for both cabin and cargo transport
  6. Any temperature or weather restrictions
  7. Any breed restrictions
  8. Official airline website if found

  Return ONLY the JSON object with all available information. If any information is not found, use null for that field.`;

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt} to get pet policy from OpenAI API`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      if (!responseData.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from OpenAI API');
      }

      const rawContent = responseData.choices[0].message.content;
      console.log('Raw API response:', rawContent);

      let content;
      try {
        content = JSON.parse(rawContent);
      } catch (parseError) {
        console.log('Initial parse failed, attempting to clean content');
        const cleanContent = rawContent
          .replace(/```json\n?|\n?```/g, '')
          .replace(/^\s*\{/, '{')
          .replace(/\}\s*$/, '}')
          .trim();
        
        try {
          content = JSON.parse(cleanContent);
        } catch (secondError) {
          console.error('Failed to parse cleaned content:', secondError);
          throw new Error(`JSON parsing failed: ${secondError.message}`);
        }
      }

      console.log('Successfully parsed content:', content);

      if (!content.pet_policy || !content.airline_info) {
        throw new Error('Invalid response structure: missing required fields');
      }

      return {
        pet_types_allowed: content.pet_policy.pet_types_allowed || [],
        carrier_requirements_cabin: content.pet_policy.carrier_requirements_cabin || '',
        carrier_requirements_cargo: content.pet_policy.carrier_requirements_cargo || '',
        documentation_needed: content.pet_policy.documentation_needed || [],
        temperature_restrictions: content.pet_policy.temperature_restrictions || '',
        breed_restrictions: content.pet_policy.breed_restrictions || [],
        policy_url: content.airline_info?.official_website || null,
        size_restrictions: {
          max_weight_cabin: content.pet_policy.size_restrictions?.max_weight_cabin || null,
          max_weight_cargo: content.pet_policy.size_restrictions?.max_weight_cargo || null,
          carrier_dimensions_cabin: content.pet_policy.size_restrictions?.carrier_dimensions_cabin || null
        },
        fees: {
          in_cabin: content.pet_policy.fees?.in_cabin || null,
          cargo: content.pet_policy.fees?.cargo || null
        }
      };

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
