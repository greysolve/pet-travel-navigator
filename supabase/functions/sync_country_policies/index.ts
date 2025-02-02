import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { SyncManager } from '../_shared/SyncManager.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

async function fetchPolicyWithAI(country: string, policyType: 'pet' | 'live_animal', retryCount = 0) {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY')
  if (!PERPLEXITY_API_KEY) {
    console.error('Missing Perplexity API key')
    throw new Error('Server configuration error: Missing API key')
  }

  console.log(`Starting AI policy fetch for ${country} (${policyType}) - Attempt ${retryCount + 1}`)

  try {
    const systemPrompt = `You are a helpful assistant specializing in finding official government pet and live animal import policies. 
    Your primary focus is on identifying and extracting information from official government sources only.
    Always verify the authority responsible for animal imports and use their official documentation.
    Return ONLY a raw JSON object, with no markdown formatting, no backticks, and no explanations.
    The response must start with { and end with }.`
    
    const userPrompt = `For ${country}'s ${policyType === 'pet' ? 'pet' : 'live animal'} import requirements:
    1. First identify the official government authority responsible for animal imports (e.g. Department of Agriculture, Customs and Border Protection)
    2. Find their official website and locate the specific policy page for pet/animal imports
    3. Extract the complete policy details from this authoritative source only
    4. Include both the authority name and official policy URL in your response
    
    Format as a JSON object with this structure:
    {
      "title": "string (required)",
      "description": "string (required)",
      "requirements": ["string"] or [],
      "documentation_needed": ["string"] or [],
      "fees": {"description": "string"} or {},
      "restrictions": {"description": "string"} or {},
      "quarantine_requirements": "string or null",
      "vaccination_requirements": ["string"] or [],
      "additional_notes": "string or null",
      "policy_url": "URL of the official government source (required)",
      "authority": "Name of the official government authority (required)"
    }`

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
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Perplexity API error for ${country}:`, errorText);
      
      if (retryCount < MAX_RETRIES && (response.status === 429 || response.status >= 500)) {
        console.log(`Retrying ${country} after ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchPolicyWithAI(country, policyType, retryCount + 1);
      }
      
      throw new Error(`API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Received AI response for ${country}. Status: ${response.status}`);
    
    const content = data.choices[0].message.content.trim();
    console.log('Raw AI response:', content);
    
    // Strip any markdown formatting if present
    const cleanContent = content.replace(/^```json\s*|\s*```$/g, '').trim();
    console.log('Cleaned content:', cleanContent);
    
    try {
      const policyData = JSON.parse(cleanContent);
      console.log('Parsed policy data:', policyData);
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
        policy_url: policyData.policy_url || null,
        authority: policyData.authority || null
      };
    } catch (parseError) {
      console.error(`Error parsing JSON for ${country}:`, parseError);
      throw new Error(`Failed to parse policy data: ${parseError.message}`);
    }
  } catch (error) {
    console.error(`Error in fetchPolicyWithAI for ${country}:`, error);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying ${country} after ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchPolicyWithAI(country, policyType, retryCount + 1);
    }
    
    throw error;
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          error: 'Method not allowed',
          details: `Method ${req.method} is not supported` 
        }), 
        { 
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Missing required environment variables' 
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

    // Parse request body to get testCountry if provided
    const { testCountry } = await req.json();
    console.log('Test country provided:', testCountry);

    // Initialize sync manager and get current progress
    const syncManager = new SyncManager(supabaseUrl, supabaseKey, 'countryPolicies');
    const currentProgress = await syncManager.getCurrentProgress();
    
    // Get countries - either all or just the test country
    const supabase = createClient(supabaseUrl, supabaseKey);
    let countries: string[] = [];
    
    if (testCountry) {
      console.log(`Processing single country: ${testCountry}`);
      countries = [testCountry];
    } else {
      const { data: allCountries, error: countriesError } = await supabase.rpc('get_distinct_countries');
      if (countriesError) {
        console.error('Error fetching countries:', countriesError);
        throw countriesError;
      }
      countries = [...new Set(
        allCountries
          .map(row => row.country?.trim() || '')
          .filter(country => country !== '')
          .map(country => country.normalize('NFKC').trim())
      )].sort();
    }

    if (!countries.length) {
      console.error('No countries found to process');
      return new Response(
        JSON.stringify({ 
          error: 'No data',
          details: 'No countries found to process' 
        }), 
        { 
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const total = countries.length;
    console.log(`Total countries to process: ${total}`);
    
    // If no progress exists, initialize it
    if (!currentProgress) {
      await syncManager.initialize(total);
    }
    
    // Get the current progress again (in case we just initialized it)
    const progress = await syncManager.getCurrentProgress();
    if (!progress) {
      throw new Error('Failed to initialize or retrieve sync progress');
    }

    // Find starting point - use last_processed from database
    const startIndex = progress.last_processed
      ? countries.findIndex(c => c === progress.last_processed) + 1
      : 0;

    // If we've processed everything, complete the sync
    if (startIndex >= countries.length) {
      await syncManager.updateProgress({
        is_complete: true,
        needs_continuation: false
      });
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Sync completed successfully'
        }), 
        { 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Process next batch
    const endIndex = Math.min(startIndex + BATCH_SIZE, countries.length);
    const batchCountries = countries.slice(startIndex, endIndex);
    
    console.log(`Processing countries ${startIndex} to ${endIndex} of ${countries.length}`);
    
    for (const country of batchCountries) {
      try {
        console.log(`Fetching policy for ${country}`);
        const policy = await fetchPolicyWithAI(country, 'pet');
        
        const { error: upsertError } = await supabase
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
          await syncManager.addErrorItem(country, upsertError.message);
        } else {
          await syncManager.addProcessedItem(country);
        }
      } catch (error) {
        console.error(`Error processing ${country}:`, error);
        await syncManager.addErrorItem(country, error.message);
      }
    }

    // Update progress to indicate more work needed
    await syncManager.updateProgress({
      needs_continuation: endIndex < countries.length
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Batch processed successfully',
        needs_continuation: endIndex < countries.length
      }), 
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error in sync_country_policies:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred',
        details: error.stack,
        shouldReset: true,
        needs_continuation: false
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