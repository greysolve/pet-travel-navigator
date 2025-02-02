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
    if (!airlines?.length) {
      console.log('No airlines found to process');
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          processed_items: [],
          error_items: [],
          continuation_token: null,
          shouldReset: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processedAirlines: string[] = [];
    const errorAirlines: string[] = [];
    let processedCount = 0;

    for (const airline of airlines) {
      try {
        console.log(`Processing airline: ${airline.name} (${airline.id})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting delay

        const systemPrompt = 'Return only a raw JSON object. No markdown, no formatting, no backticks, no explanations. The response must start with { and end with }. Do not wrap the response in any code blocks or quotes.';
        
        const userPrompt = `Generate a JSON object for ${airline.name}'s pet travel policies. Use this exact structure:
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
    "policy_url": "string (must be from the airline's own website domain) or null if no information is found -- no explanation of not found data"
  }
}`;

        console.log('Sending request to Perplexity API...');
        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
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

        // Clean the response content by removing any markdown formatting
        const cleanContent = responseData.choices[0].message.content
          .replace(/```json\n?/g, '')  // Remove ```json
          .replace(/```\n?/g, '')      // Remove closing ```
          .trim();                     // Remove any extra whitespace

        console.log('Cleaned content:', cleanContent);
        
        const content = JSON.parse(cleanContent);
        console.log('Parsed content:', content);

        // Update airline website if we got a valid one
        if (content.airline_info?.official_website) {
          console.log('Updating airline website:', content.airline_info.official_website);
          const { error: updateError } = await supabase
            .from('airlines')
            .update({ 
              website: content.airline_info.official_website,
              updated_at: new Date().toISOString()
            })
            .eq('id', airline.id);

          if (updateError) {
            console.error('Error updating airline website:', updateError);
            throw updateError;
          }
        }

        // Process pet policy data
        if (content.pet_policy) {
          console.log('Storing pet policy data:', content.pet_policy);
          const { error: policyError } = await supabase
            .from('pet_policies')
            .upsert({
              airline_id: airline.id,
              ...content.pet_policy,
              updated_at: new Date().toISOString(),
            }, { 
              onConflict: 'airline_id'
            });

          if (policyError) {
            console.error('Error storing pet policy:', policyError);
            throw policyError;
          }
        }

        processedAirlines.push(airline.name);
        processedCount++;
        console.log(`Successfully processed airline: ${airline.name}`);

      } catch (error) {
        console.error(`Error processing airline ${airline.name}:`, error);
        errorAirlines.push(`${airline.name} (${error.message})`);
      }
    }

    const lastProcessedId = airlines[airlines.length - 1].id;
    const hasMore = airlines.length === batchSize;

    const response = {
      success: true,
      processed: processedCount,
      processed_items: processedAirlines,
      error_items: errorAirlines,
      continuation_token: hasMore ? lastProcessedId : null,
      shouldReset: !hasMore
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
        success: false,
        shouldReset: true
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