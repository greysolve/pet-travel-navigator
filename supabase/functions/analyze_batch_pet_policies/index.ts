
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Airline {
  id: string;
  name: string;
  iata_code: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate Perplexity API key
    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityKey) {
      console.error('PERPLEXITY_API_KEY is not set');
      throw new Error('API key configuration error');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Database configuration error');
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get airlines batch from request body
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
        const petPolicy = await analyzePetPolicy(airline, perplexityKey);
        
        // Upsert the pet policy
        const { error: upsertError } = await supabase
          .from('pet_policies')
          .upsert({
            airline_id: airline.id,
            ...petPolicy
          }, {
            onConflict: 'airline_id'
          });

        if (upsertError) {
          throw upsertError;
        }

        // Update airline website if provided
        if (petPolicy.policy_url) {
          const { error: airlineError } = await supabase
            .from('airlines')
            .update({ website: petPolicy.policy_url })
            .eq('id', airline.id);

          if (airlineError) {
            console.error(`Error updating airline website: ${airlineError.message}`);
          }
        }

        results.push({
          airline_id: airline.id,
          success: true,
          iata_code: airline.iata_code
        });

      } catch (error) {
        console.error(`Error processing ${airline.name}:`, error);
        errors.push({
          airline_id: airline.id,
          error: error.message,
          iata_code: airline.iata_code
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        errors
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

async function analyzePetPolicy(airline: Airline, perplexityKey: string): Promise<any> {
  console.log(`Analyzing pet policy for airline: ${airline.name}`);
  
  const systemPrompt = `You are a helpful assistant that analyzes airline pet policies and returns the information in a structured JSON format. Return ONLY the JSON object, nothing else.`;
  
  const userMessage = `Analyze this airline's pet policy and return a JSON object with the following information for ${airline.name}:
  - Allowed pet types (in cabin and cargo)
  - Size and weight restrictions
  - Carrier requirements
  - Required documentation
  - Associated fees
  - Temperature restrictions
  - Breed restrictions
  
  If you find their website, include it in the response.
  
  Format the response as a JSON object with these fields:
  {
    "airline_info": {
      "official_website": "url if found"
    },
    "pet_policy": {
      "pet_types_allowed": ["list of allowed pets"],
      "size_restrictions": {
        "max_weight": "weight in kg/lbs",
        "carrier_dimensions": "size limits"
      },
      "carrier_requirements": "description",
      "documentation_needed": ["list of required documents"],
      "fees": {
        "in_cabin": "fee amount",
        "cargo": "fee amount"
      },
      "temperature_restrictions": "description",
      "breed_restrictions": ["list of restricted breeds"]
    }
  }`;

  try {
    console.log('Sending request to Perplexity API');
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
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
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    if (!responseData.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Perplexity API');
    }

    const rawContent = responseData.choices[0].message.content;
    console.log('Raw API response content:', rawContent);
    
    const cleanContent = rawContent.replace(/```json\n?|\n?```/g, '').trim();
    console.log('Cleaned content:', cleanContent);
    
    const content = JSON.parse(cleanContent);
    console.log('Parsed content:', content);

    return {
      pet_types_allowed: content.pet_policy.pet_types_allowed,
      size_restrictions: content.pet_policy.size_restrictions,
      carrier_requirements: content.pet_policy.carrier_requirements,
      documentation_needed: content.pet_policy.documentation_needed,
      fees: content.pet_policy.fees,
      temperature_restrictions: content.pet_policy.temperature_restrictions,
      breed_restrictions: content.pet_policy.breed_restrictions,
      policy_url: content.airline_info?.official_website
    };
  } catch (error) {
    console.error(`Error analyzing pet policy for ${airline.name}:`, error);
    throw error;
  }
}
