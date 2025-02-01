import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Edge Function: sync_country_policies initialized')

const BATCH_SIZE = 10
const MAX_RETRIES = 3
const MAX_EXECUTION_TIME = 25000

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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
  const processed = [...state.processedItems]; // Preserve existing processed items
  const errors = [...state.errorItems]; // Preserve existing error items
  let shouldContinue = true;
  let processedCount = state.processedCount; // Start from existing count

  try {
    const startIndex = state.lastProcessedCountry 
      ? countries.findIndex(c => c === state.lastProcessedCountry) + 1 
      : 0;

    console.log(`Starting at index ${startIndex}, total countries: ${countries.length}, current processed count: ${processedCount}`);

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
      if (Date.now() - state.startTime > MAX_EXECUTION_TIME) {
        console.log('Approaching execution time limit, gracefully stopping batch');
        shouldContinue = true;
        break;
      }

      const country = countries[i];
      try {
        console.log(`Processing country ${i + 1}/${countries.length}: ${country}`);
        
        const policy = await fetchPolicyWithRetry(country, 'pet');
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
          
          // Update progress after each country
          try {
            const { error: progressError } = await supabaseClient
              .from('sync_progress')
              .upsert({
                type: 'countryPolicies',
                total: countries.length,
                processed: processedCount,
                last_processed: country,
                processed_items: processed,
                error_items: errors,
                start_time: new Date(state.startTime).toISOString(),
                is_complete: false
              }, {
                onConflict: 'type'
              });

            if (progressError) {
              console.error('Error updating progress:', progressError);
            }
          } catch (progressUpdateError) {
            console.error('Failed to update progress:', progressUpdateError);
          }
          
          console.log(`Successfully processed policy for ${country}. Total processed: ${processedCount}`);
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
    console.log(`Batch complete. Processed: ${processed.length}, Total processed: ${processedCount}, Errors: ${errors.length}, Has more: ${hasMoreCountries}`);
    
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

async function fetchPolicyWithRetry(country: string, policyType: 'pet' | 'live_animal', retryCount = 0): Promise<any> {
  try {
    return await fetchPolicyWithAI(country, policyType)
  } catch (error) {
    console.error(`Attempt ${retryCount + 1} failed for ${country}:`, error)
    
    if (retryCount < MAX_RETRIES && 
        (error.message?.includes('rate limit') || error.message?.includes('quota exceeded'))) {
      const backoffDelay = Math.pow(2, retryCount) * 1000
      await delay(backoffDelay)
      return fetchPolicyWithRetry(country, policyType, retryCount + 1)
    }
    throw error
  }
}

Deno.serve(async (req) => {
  // Log incoming request details
  console.log('Request received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    console.log('Initializing Supabase client...');
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    const requestBody = await req.json().catch(() => ({}));
    const lastProcessedCountry = requestBody.lastProcessedCountry || null;
    
    // Get existing progress if resuming
    let existingProgress = { processed: 0, processedItems: [], errorItems: [] };
    if (lastProcessedCountry) {
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
    
    const state: ProcessingState = {
      lastProcessedCountry,
      processedCount: existingProgress.processed,
      processedItems: existingProgress.processedItems,
      errorItems: existingProgress.errorItems,
      startTime: Date.now()
    };

    const { processed, errors, shouldContinue, lastProcessedCountry: finalProcessedCountry, processedCount } = 
      await processBatch(uniqueCountries, supabaseClient, state);

    const summary = {
      success: true,
      total_countries: uniqueCountries.length,
      processed_policies: processedCount,
      processed_countries: processed,
      error_countries: errors,
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