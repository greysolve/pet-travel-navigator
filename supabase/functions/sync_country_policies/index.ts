import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BATCH_SIZE = 10;

interface ProcessingState {
  lastProcessedCountry: string | null;
  processedCount: number;
  startTime: number;
  processedItems: string[];
  errorItems: string[];
}

async function processBatch(
  countries: string[], 
  supabaseClient: any,
  state: ProcessingState
): Promise<{ 
  processed: string[], 
  errors: string[], 
  shouldContinue: boolean,
  lastProcessedCountry: string | null,
  processedCount: number 
}> {
  console.log(`Starting batch processing from country: ${state.lastProcessedCountry || 'START'}`);
  const processed = [...state.processedItems];
  const errors = [...state.errorItems];
  let shouldContinue = true;
  let processedCount = state.processedCount;

  try {
    const startIndex = state.lastProcessedCountry 
      ? countries.findIndex(c => c === state.lastProcessedCountry) + 1 
      : 0;

    console.log(`Starting at index ${startIndex}, total countries: ${countries.length}`);

    if (startIndex >= countries.length) {
      console.log('All countries have been processed');
      return {
        processed,
        errors,
        shouldContinue: false,
        lastProcessedCountry: null,
        processedCount
      };
    }

    const endIndex = Math.min(startIndex + BATCH_SIZE, countries.length);
    console.log(`Processing countries from index ${startIndex} to ${endIndex}`);

    for (let i = startIndex; i < endIndex; i++) {
      const country = countries[i];
      try {
        console.log(`Processing country ${i + 1}/${countries.length}: ${country}`);
        
        const policy = await fetchPolicyWithAI(country, 'pet');
        console.log(`Policy data received for ${country}:`, policy);

        const { error: upsertError } = await supabaseClient
          .from('country_policies')
          .upsert({
            country_code: country,
            policy_type: 'pet',
            ...policy,
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'country_code,policy_type'
          });

        if (upsertError) {
          console.error(`Error upserting policy for ${country}:`, upsertError);
          errors.push(country);
        } else {
          processed.push(country);
          processedCount++;
          
          // Update progress without affecting other syncs
          const { error: progressError } = await supabaseClient
            .from('sync_progress')
            .update({
              processed: processedCount,
              last_processed: country,
              processed_items: processed,
              error_items: errors,
              is_complete: false,
              updated_at: new Date().toISOString()
            })
            .eq('type', 'countryPolicies')
            .select()
            .single();

          if (progressError) {
            console.error('Error updating progress:', progressError);
          }
        }

      } catch (error) {
        console.error(`Error processing country ${country}:`, error);
        errors.push(country);
        
        if (error.message?.includes('rate limit') || error.message?.includes('quota exceeded')) {
          console.log('Rate limit or quota reached, gracefully stopping batch');
          shouldContinue = true;
          break;
        }
      }
    }

    const hasMoreCountries = endIndex < countries.length;
    console.log(`Batch complete. Processed: ${processed.length}, Errors: ${errors.length}, Has more: ${hasMoreCountries}`);
    
    return { 
      processed, 
      errors, 
      shouldContinue: hasMoreCountries,
      lastProcessedCountry: hasMoreCountries ? countries[endIndex - 1] : null,
      processedCount
    };
  } catch (error) {
    console.error('Unexpected error in processBatch:', error);
    return {
      processed,
      errors: [...errors, 'BATCH_PROCESSING_ERROR'],
      shouldContinue: true,
      lastProcessedCountry: state.lastProcessedCountry,
      processedCount
    };
  }
}

async function fetchPolicyWithAI(country: string, policyType: 'pet' | 'live_animal') {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY')
  if (!PERPLEXITY_API_KEY) {
    throw new Error('Missing Perplexity API key')
  }

  console.log(`Starting AI policy fetch for ${country} (${policyType})`)

  const systemPrompt = 'Return only a raw JSON object. No markdown, no formatting, no backticks, no explanations. The response must start with { and end with }.'
  
  const userPrompt = `Generate a JSON object for ${country}'s ${policyType === 'pet' ? 'pet' : 'live animal'} import requirements. The response must start with { and end with }. Use this exact structure:
{
  "title": "string or null if unknown",
  "description": "string or null if unknown",
  "requirements": ["string"] or [] if none,
  "documentation_needed": ["string"] or [] if none,
  "fees": {"description": "string"} or {} if none,
  "restrictions": {"description": "string"} or {} if none,
  "quarantine_requirements": "string or null if none",
  "vaccination_requirements": ["string"] or [] if none,
  "additional_notes": "string or null if none"
}`

  console.log(`Making API request to Perplexity for ${country}...`)
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
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
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Perplexity API error for ${country}:`, errorText)
    throw new Error(`Perplexity API error: ${response.statusText}`)
  }

  const data = await response.json()
  console.log(`Received AI response for ${country}. Status: ${response.status}`)
  
  const content = data.choices[0].message.content.trim()
  console.log('Raw AI response:', content)
  
  try {
    const policyData = JSON.parse(content)
    
    return {
      title: policyData.title || `${country} ${policyType === 'pet' ? 'Pet' : 'Live Animal'} Import Requirements`,
      description: policyData.description || `Official ${policyType === 'pet' ? 'pet' : 'live animal'} import requirements and regulations for ${country}.`,
      requirements: Array.isArray(policyData.requirements) ? policyData.requirements : [],
      documentation_needed: Array.isArray(policyData.documentation_needed) ? policyData.documentation_needed : [],
      fees: typeof policyData.fees === 'object' ? policyData.fees : {},
      restrictions: typeof policyData.restrictions === 'object' ? policyData.restrictions : {},
      quarantine_requirements: policyData.quarantine_requirements || '',
      vaccination_requirements: Array.isArray(policyData.vaccination_requirements) ? policyData.vaccination_requirements : [],
      additional_notes: policyData.additional_notes || '',
    }
  } catch (error) {
    console.error(`Error parsing AI response for ${country}:`, error)
    throw new Error(`Invalid AI response format for ${country}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    console.log('Request received:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const requestBody = await req.json().catch(() => ({}));
    const lastProcessedCountry = requestBody.lastProcessedCountry || null;
    const isResuming = !!lastProcessedCountry;
    
    // Get existing progress without resetting
    let existingProgress = { processed: 0, processedItems: [], errorItems: [] };
    const { data: progressData } = await supabaseClient
      .from('sync_progress')
      .select('*')
      .eq('type', 'countryPolicies')
      .single();
    
    if (progressData) {
      existingProgress = {
        processed: progressData.processed || 0,
        processedItems: progressData.processed_items || [],
        errorItems: progressData.error_items || []
      };
      console.log('Retrieved existing progress:', existingProgress);
    } else if (!isResuming) {
      // Only initialize if there's no existing progress and we're not resuming
      const { error: initError } = await supabaseClient
        .from('sync_progress')
        .upsert({
          type: 'countryPolicies',
          total: 0,
          processed: 0,
          processed_items: [],
          error_items: [],
          start_time: new Date().toISOString(),
          is_complete: false
        }, {
          onConflict: 'type'
        });

      if (initError) {
        console.error('Error initializing progress:', initError);
        throw initError;
      }
    }

    const { data: countries, error: countriesError } = await supabaseClient
      .rpc('get_distinct_countries');

    if (countriesError) {
      console.error('Error fetching countries:', countriesError);
      throw countriesError;
    }

    if (!countries || !Array.isArray(countries)) {
      throw new Error('Invalid response from get_distinct_countries');
    }

    console.log('Total countries fetched:', countries.length);

    const uniqueCountries = countries
      .map(row => row.country?.trim() || '')
      .filter(country => country !== '')
      .map(country => country.normalize('NFKC').trim())
      .sort();

    console.log('Processing countries:', uniqueCountries);
    
    // Maintain state across batches
    const state: ProcessingState = {
      lastProcessedCountry,
      processedCount: existingProgress.processed,
      startTime: isResuming ? 
        (await supabaseClient
          .from('sync_progress')
          .select('start_time')
          .eq('type', 'countryPolicies')
          .single()
        ).data?.start_time || Date.now() 
        : Date.now(),
      processedItems: existingProgress.processedItems,
      errorItems: existingProgress.errorItems
    };

    // Update total only if we're starting fresh
    if (!isResuming) {
      const { error: updateTotalError } = await supabaseClient
        .from('sync_progress')
        .update({ total: uniqueCountries.length })
        .eq('type', 'countryPolicies');

      if (updateTotalError) {
        console.error('Error updating total:', updateTotalError);
        throw updateTotalError;
      }
    }

    const { processed, errors, shouldContinue, lastProcessedCountry: finalProcessedCountry, processedCount } = 
      await processBatch(uniqueCountries, supabaseClient, state);

    // Only mark as complete if we're done with all countries
    if (!shouldContinue) {
      const { error: completeError } = await supabaseClient
        .from('sync_progress')
        .update({ is_complete: true })
        .eq('type', 'countryPolicies');

      if (completeError) {
        console.error('Error marking sync as complete:', completeError);
      }
    }

    const summary = {
      success: true,
      total: uniqueCountries.length,
      processed: processedCount,
      processed_items: processed,
      error_items: errors,
      continuation_token: shouldContinue ? finalProcessedCountry : null,
      completed: !shouldContinue
    };

    console.log('Country policies sync progress:', summary);

    return new Response(
      JSON.stringify(summary),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in sync_country_policies:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500,
      }
    );
  }
});
