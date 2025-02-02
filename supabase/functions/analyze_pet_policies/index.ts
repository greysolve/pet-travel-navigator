import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    console.log('Starting pet policy batch analysis...');
    
    const { lastProcessedAirline, batchSize = 3 } = await req.json();
    console.log('Request body:', { lastProcessedAirline, batchSize });

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('Missing Perplexity API key');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from('airlines')
      .select('id, name, website')
      .eq('active', true)
      .order('id')
      .limit(batchSize);

    if (lastProcessedAirline) {
      query = query.gt('id', lastProcessedAirline);
    }

    const { data: airlines, error: airlinesError } = await query;

    if (airlinesError) {
      console.error('Error fetching airlines:', airlinesError);
      throw new Error(`Failed to fetch airlines: ${airlinesError.message}`);
    }

    console.log(`Processing batch of ${airlines?.length} airlines`);

    const processedAirlines: string[] = [];
    const errorAirlines: string[] = [];
    let processedCount = 0;

    for (const airline of airlines || []) {
      try {
        console.log(`Processing airline: ${airline.name} (${airline.id})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting delay

        const prompt = `
          Analyze this airline: ${airline.name}
          
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
        `;

        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
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
                content: 'You are a specialized AI focused on finding official airline websites and their pet travel policies. Only return URLs from airlines\' official websites. Return ONLY valid JSON, no explanations, no markdown formatting, no code blocks.'
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

        if (!perplexityResponse.ok) {
          throw new Error(`Perplexity API error: ${perplexityResponse.statusText}`);
        }

        const responseData = await perplexityResponse.json();
        console.log('Perplexity API response:', responseData);

        if (!responseData.choices?.[0]?.message?.content) {
          throw new Error('Invalid API response structure');
        }

        let content;
        try {
          // Try to parse the content directly
          content = JSON.parse(responseData.choices[0].message.content.trim());
        } catch (parseError) {
          console.error('Failed to parse JSON directly:', parseError);
          
          // Try to extract JSON if it's wrapped in markdown code blocks
          const jsonMatch = responseData.choices[0].message.content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          if (jsonMatch) {
            content = JSON.parse(jsonMatch[1].trim());
          } else {
            throw new Error('Could not parse valid JSON from response');
          }
        }

        // Update airline website if we got a valid one
        if (content.airline_info?.official_website) {
          console.log('Updating airline website:', content.airline_info.official_website);
          await supabase
            .from('airlines')
            .update({ 
              website: content.airline_info.official_website,
              updated_at: new Date().toISOString()
            })
            .eq('id', airline.id);
        }

        // Process pet policy data
        if (content.pet_policy) {
          console.log('Storing pet policy data:', content.pet_policy);
          await supabase
            .from('pet_policies')
            .upsert({
              airline_id: airline.id,
              ...content.pet_policy,
              updated_at: new Date().toISOString(),
            }, { 
              onConflict: 'airline_id'
            });
        }

        processedAirlines.push(airline.name);
        processedCount++;

      } catch (error) {
        console.error(`Error processing airline ${airline.name}:`, error);
        errorAirlines.push(`${airline.name} (${error.message})`);
      }
    }

    const lastProcessedId = airlines && airlines.length > 0 ? airlines[airlines.length - 1].id : null;
    const hasMore = airlines && airlines.length === batchSize;

    const response = {
      success: true,
      processed: processedCount,
      processed_items: processedAirlines,
      error_items: errorAirlines,
      continuation_token: hasMore ? lastProcessedId : null
    };

    console.log('Returning response:', response);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('Error in edge function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }), 
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        }
      }
    );
  }
});