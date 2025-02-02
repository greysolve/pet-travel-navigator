import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { stripMarkdown } from 'https://deno.land/x/strip_markdown/mod.ts'
import { SyncManager } from '../_shared/SyncManager.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function cleanAndParseJSON(content: string): string {
  console.log('Original content:', content);
  
  // Strip markdown and clean the content
  let cleaned = stripMarkdown(content).trim();
  
  // Find the first occurrence of a JSON object
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  
  if (jsonStart === -1 || jsonEnd === -1) {
    console.error('No JSON object found in content');
    throw new Error('No valid JSON object found in response');
  }
  
  // Extract just the JSON portion
  cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  
  console.log('Cleaned content:', cleaned);
  
  // Validate JSON structure
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (error) {
    console.error('JSON validation failed:', error);
    console.error('Failed content:', cleaned);
    throw new Error(`Failed to parse JSON: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    const syncManager = new SyncManager(supabaseUrl, supabaseKey, 'petPolicies');

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
      await syncManager.completeSync();
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

    const currentProgress = await syncManager.getCurrentProgress();
    const processedAirlines = currentProgress?.processed_items || [];
    const errorAirlines = currentProgress?.error_items || [];
    let processedCount = currentProgress?.processed || 0;

    // Initialize sync if not resuming
    if (!currentProgress) {
      const { data: totalAirlines } = await supabase
        .from('airlines')
        .select('id', { count: 'exact' })
        .eq('active', true);
      
      await syncManager.initialize(totalAirlines?.length || 0);
    }

    for (const airline of airlines) {
      try {
        console.log(`Processing airline: ${airline.name} (${airline.id})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting delay

        const systemPrompt = 'Return only a raw JSON object. No markdown, no formatting, no backticks, no explanations.';
        
        const userPrompt = `Generate a JSON object for ${airline.name}'s pet travel policies. Use this exact structure:
{
  "airline_info": {
    "official_website": "string (the airline's official website URL)"
  },
  "pet_policy": {
    "pet_types_allowed": ["string"],
    "carrier_requirements": "string",
    "documentation_needed": ["string"],
    "temperature_restrictions": "string",
    "breed_restrictions": ["string"],
    "policy_url": "string or null if no information is found"
  }
}`;

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
        const rawContent = responseData.choices[0].message.content;
        console.log('Raw API response content:', rawContent);
        
        // Clean the content before parsing
        const cleanedContent = stripMarkdown(rawContent);
        const content = JSON.parse(cleanedContent);

        // Update airline website if we got a valid one
        if (content.airline_info?.official_website) {
          const { error: updateError } = await supabase
            .from('airlines')
            .update({ 
              website: content.airline_info.official_website,
              updated_at: new Date().toISOString()
            })
            .eq('id', airline.id);

          if (updateError) throw updateError;
        }

        // Process pet policy data
        if (content.pet_policy) {
          const { error: policyError } = await supabase
            .from('pet_policies')
            .upsert({
              airline_id: airline.id,
              ...content.pet_policy,
              updated_at: new Date().toISOString(),
            }, { 
              onConflict: 'airline_id'
            });

          if (policyError) throw policyError;
        }

        processedAirlines.push(airline.name);
        processedCount++;

        // Update sync progress
        await syncManager.updateProgress({
          processed: processedCount,
          last_processed: airline.name,
          processed_items: [...new Set(processedAirlines)],
          error_items: [...new Set(errorAirlines)]
        });

        console.log(`Successfully processed airline: ${airline.name}`);

      } catch (error) {
        console.error(`Error processing airline ${airline.name}:`, error);
        errorAirlines.push(`${airline.name} (${error.message})`);
        
        // Update sync progress with error
        await syncManager.updateProgress({
          error_items: [...new Set(errorAirlines)]
        });
      }
    }

    const lastProcessedId = airlines[airlines.length - 1].id;
    const hasMore = airlines.length === batchSize;

    if (!hasMore) {
      await syncManager.completeSync();
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        processed_items: [...new Set(processedAirlines)],
        error_items: [...new Set(errorAirlines)],
        continuation_token: hasMore ? lastProcessedId : null,
        shouldReset: !hasMore
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in edge function:', error);
    
    // Clean up on error
    const syncManager = new SyncManager(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      'petPolicies'
    );
    await syncManager.cleanup();

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred',
        details: error.stack,
        shouldReset: true
      }),
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
});

