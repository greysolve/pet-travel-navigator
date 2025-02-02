import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { SyncManager } from '../_shared/SyncManager.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
function handleCorsRequest(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCorsRequest(req);
  if (corsResponse) return corsResponse;

  try {
    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityKey) {
      throw new Error('PERPLEXITY_API_KEY is not set');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === 'POST') {
      const { resume } = await req.json();
      console.log('Received sync request, resume:', resume);

      const syncManager = new SyncManager(supabaseUrl, supabaseKey, 'petPolicies');
      await syncManager.initialize(resume);

      try {
        const { data: airlines, error: airlinesError } = await supabase
          .from('airlines')
          .select('*')
          .eq('active', true)
          .order('name');

        if (airlinesError) {
          throw airlinesError;
        }

        console.log(`Processing ${airlines.length} airlines`);

        for (const airline of airlines) {
          try {
            if (await syncManager.shouldProcessItem(airline.name)) {
              console.log(`Processing airline: ${airline.name}`);
              
              const petPolicy = await analyzePetPolicy(airline, perplexityKey);
              
              const { error: upsertError } = await supabase
                .from('pet_policies')
                .upsert({
                  airline_id: airline.id,
                  ...petPolicy
                });

              if (upsertError) {
                throw upsertError;
              }

              await syncManager.markItemProcessed(airline.name);
              console.log(`Successfully processed ${airline.name}`);
            }
          } catch (error) {
            console.error(`Error processing ${airline.name}:`, error);
            await syncManager.markItemError(airline.name, error.message);
          }
        }

        await syncManager.complete();
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Error in sync process:', error);
        throw error;
      }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
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

async function analyzePetPolicy(airline: any, perplexityKey: string): Promise<any> {
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
    console.log('Received response from Perplexity API');

    if (responseData.choices && responseData.choices[0]?.message?.content) {
      try {
        const rawContent = responseData.choices[0].message.content;
        console.log('Raw API response content:', rawContent);
        
        // Parse the response directly
        const content = JSON.parse(rawContent);
        console.log('Parsed content:', content);

        // Update airline website if we got a valid one
        if (content.airline_info?.official_website) {
          console.log(`Updating website for airline ${airline.name}:`, content.airline_info.official_website);
          
          const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          );

          const { error: updateError } = await supabase
            .from('airlines')
            .update({ website: content.airline_info.official_website })
            .eq('id', airline.id);

          if (updateError) {
            console.error('Error updating airline website:', updateError);
          }
        }

        // Store the pet policy
        const petPolicy = {
          airline_id: airline.id,
          pet_types_allowed: content.pet_policy.pet_types_allowed,
          size_restrictions: content.pet_policy.size_restrictions,
          carrier_requirements: content.pet_policy.carrier_requirements,
          documentation_needed: content.pet_policy.documentation_needed,
          fees: content.pet_policy.fees,
          temperature_restrictions: content.pet_policy.temperature_restrictions,
          breed_restrictions: content.pet_policy.breed_restrictions
        };

        return petPolicy;
      } catch (error) {
        console.error(`Error processing response for ${airline.name}:`, error);
        throw new Error(`Failed to parse JSON: ${error.message}`);
      }
    } else {
      throw new Error('Invalid response format from Perplexity API');
    }
  } catch (error) {
    console.error(`Error analyzing pet policy for ${airline.name}:`, error);
    throw error;
  }
}
