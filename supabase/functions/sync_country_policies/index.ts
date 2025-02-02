import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchPolicyWithAI(country: string, apiKey: string) {
  console.log(`Fetching policy for ${country}`);
  
  const systemPrompt = `You are a helpful assistant specializing in finding official government pet import policies. 
  Return ONLY a raw JSON object, with no markdown formatting or explanations.`;
  
  const userPrompt = `For ${country}'s pet import requirements:
  1. Find the official government authority and website for animal imports
  2. Extract the complete policy details
  
  Format as a JSON object with this structure:
  {
    "title": "string",
    "description": "string",
    "requirements": ["string"],
    "documentation_needed": ["string"],
    "fees": {"description": "string"},
    "restrictions": {"description": "string"},
    "quarantine_requirements": "string",
    "vaccination_requirements": ["string"],
    "additional_notes": "string",
    "policy_url": "URL of official source",
    "authority": "Name of authority"
  }`;

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();
  return JSON.parse(content);
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      throw new Error('Missing Perplexity API key');
    }

    // Get country from request
    const { country } = await req.json();
    if (!country) {
      throw new Error('No country specified');
    }

    console.log(`Processing country: ${country}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Initialize sync progress
    await supabase
      .from('sync_progress')
      .upsert({
        type: 'countryPolicies',
        total: 1,
        processed: 0,
        last_processed: null,
        processed_items: [],
        error_items: [],
        start_time: new Date().toISOString(),
        needs_continuation: false
      }, {
        onConflict: 'type'
      });

    // Fetch and store policy
    const policy = await fetchPolicyWithAI(country, apiKey);
    
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
      throw upsertError;
    }

    // Update progress
    await supabase
      .from('sync_progress')
      .update({
        processed: 1,
        last_processed: country,
        processed_items: [country],
        needs_continuation: false
      })
      .eq('type', 'countryPolicies');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});