import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
      
      if (retryCount < 3 && (response.status === 429 || response.status >= 500)) {
        console.log(`Retrying ${country} after 5000ms...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return fetchPolicyWithAI(country, policyType, retryCount + 1);
      }
      
      throw new Error(`API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Received AI response for ${country}. Status: ${response.status}`);
    
    const content = data.choices[0].message.content.trim();
    console.log('Raw AI response:', content);
    
    // Clean the response by removing any markdown formatting
    const cleanedContent = content
      .replace(/^```json\s*/i, '')    // Remove opening ```json with case insensitivity
      .replace(/^```\s*/i, '')        // Remove opening ``` with case insensitivity
      .replace(/\s*```\s*$/i, '')     // Remove closing ``` with case insensitivity
      .trim();                        // Remove any extra whitespace
    
    console.log('Cleaned content:', cleanedContent);
    
    try {
      return JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error(`Error parsing JSON for ${country}:`, parseError);
      console.error('Failed content:', cleanedContent);
      throw new Error(`Failed to parse policy data: ${parseError.message}`);
    }
  } catch (error) {
    console.error(`Error in fetchPolicyWithAI for ${country}:`, error);
    
    if (retryCount < 3) {
      console.log(`Retrying ${country} after 5000ms...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return fetchPolicyWithAI(country, policyType, retryCount + 1);
    }
    
    throw error;
  }
}

Deno.serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing environment variables' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body to get testCountry if provided
    const { testCountry } = await req.json();
    console.log('Test country provided:', testCountry);

    // Initialize sync manager and get current progress
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get countries - either all or just the test country
    let countries: string[] = [];
    
    if (testCountry) {
      console.log(`Processing single country: ${testCountry}`);
      countries = [testCountry];
    } else {
      const { data: allCountries, error: countriesError } = await supabase.rpc('get_distinct_countries');
      if (countriesError) {
        console.error('Error fetching countries:', countriesError);
        throw new Error(`Error fetching countries: ${countriesError.message}`);
      }
      countries = [...new Set(
        allCountries
          .map(row => row.country?.trim() || '')
          .filter(country => country !== '')
          .map(country => country.normalize('NFKC').trim())
      )].sort();
    }

    if (!countries.length) {
      return new Response(
        JSON.stringify({ error: 'No countries found to process' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const total = countries.length;
    console.log(`Total countries to process: ${total}`);
    
    // Initialize or update sync progress
    const { error: progressError } = await supabase
      .from('sync_progress')
      .upsert({
        type: 'countryPolicies',
        total,
        processed: 0,
        last_processed: null,
        processed_items: [],
        error_items: [],
        start_time: new Date().toISOString(),
        needs_continuation: false
      }, {
        onConflict: 'type'
      });

    if (progressError) {
      console.error('Error initializing sync progress:', progressError);
      throw progressError;
    }

    // Process countries
    for (const country of countries) {
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
          await supabase
            .from('sync_progress')
            .update({
              error_items: supabase.sql`array_append(error_items, ${`${country}: ${upsertError.message}`})`
            })
            .eq('type', 'countryPolicies');
        } else {
          await supabase
            .from('sync_progress')
            .update({
              processed: supabase.sql`processed + 1`,
              last_processed: country,
              processed_items: supabase.sql`array_append(processed_items, ${country})`
            })
            .eq('type', 'countryPolicies');
        }
      } catch (error) {
        console.error(`Error processing ${country}:`, error);
        await supabase
          .from('sync_progress')
          .update({
            error_items: supabase.sql`array_append(error_items, ${`${country}: ${error.message}`})`
          })
          .eq('type', 'countryPolicies');
      }
    }

    // Mark sync as complete
    await supabase
      .from('sync_progress')
      .update({
        needs_continuation: false
      })
      .eq('type', 'countryPolicies');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Sync completed successfully'
      }), 
      { 
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );

  } catch (error) {
    console.error('Error in sync_country_policies:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }), 
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
});