import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store'
}

console.log('Edge Function: sync_country_policies initialized')

Deno.serve(async (req) => {
  console.log('Request received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  })

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }

    console.log('Initializing Supabase client...')
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
    
    console.log('Fetching unique countries from airports table...')
    const { data: countries, error: airportsError } = await supabaseClient
      .from('airports')
      .select('DISTINCT country')
      .not('country', 'is', null)
      .order('country', { ascending: true })

    if (airportsError) {
      console.error('Error fetching airports:', airportsError)
      throw airportsError
    }

    // Debug Point 1: Raw countries from DB
    console.log('DEBUG POINT 1 - Raw countries from DB:', JSON.stringify(countries, null, 2))

    // Get unique countries and normalize them
    const uniqueCountries = [...new Set(
      countries
        .map(row => row.country.trim())
        .map(country => country.normalize('NFKC').trim())
    )].sort()

    // Debug Point 2: After normalization and uniquing
    console.log('DEBUG POINT 2 - Countries after normalization:', JSON.stringify(uniqueCountries, null, 2))
    
    // Intentional stop to check logs
    throw new Error('DEBUG STOP: Check logs for country processing steps')

    let processedCount = 0
    let errorCount = 0
    const processedCountries = new Set()
    const errorCountries = new Set()

    const BATCH_SIZE = 5
    for (let i = 0; i < uniqueCountries.length; i += BATCH_SIZE) {
      const batch = uniqueCountries.slice(i, i + BATCH_SIZE)
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(uniqueCountries.length/BATCH_SIZE)}...`)
      
      for (const country of batch) {
        try {
          console.log(`Processing country: ${country}`)
          const policyTypes: Array<'pet' | 'live_animal'> = ['pet', 'live_animal']
          
          for (const policyType of policyTypes) {
            try {
              console.log(`Fetching ${policyType} policy for ${country}...`)
              const policy = await fetchPolicyWithAI(country, policyType)

              console.log(`Upserting policy for ${country} (${policyType})...`)
              const { error: upsertError } = await supabaseClient
                .from('country_policies')
                .upsert({
                  country_code: country,
                  policy_type: policyType,
                  ...policy,
                  last_updated: new Date().toISOString()
                }, {
                  onConflict: 'country_code,policy_type'
                })

              if (upsertError) {
                console.error(`Error upserting policy for ${country}:`, upsertError)
                errorCountries.add(country)
                errorCount++
              } else {
                processedCount++
                processedCountries.add(country)
                console.log(`Successfully processed ${policyType} policy for ${country}`)
              }
            } catch (error) {
              console.error(`Error processing ${policyType} policy for ${country}:`, error)
              errorCountries.add(country)
              errorCount++
            }
          }
        } catch (error) {
          console.error(`Error processing country ${country}:`, error)
          errorCountries.add(country)
          errorCount++
        }
      }

      if (i + BATCH_SIZE < uniqueCountries.length) {
        console.log('Waiting before processing next batch...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    const summary = {
      success: true,
      total_countries: uniqueCountries.length,
      processed: processedCount,
      errors: errorCount,
      processed_countries: Array.from(processedCountries),
      error_countries: Array.from(errorCountries)
    }

    console.log('Country policies sync completed:', summary)

    return new Response(
      JSON.stringify(summary),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in sync_country_policies:', error)
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
    )
  }
})

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

  try {
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
    console.log(`Received AI response for ${country} ${policyType} policy. Status: ${response.status}`)
    
    try {
      const content = data.choices[0].message.content.trim()
      console.log('Raw AI response:', content)
      
      // Clean the response - remove any markdown formatting
      const cleanedContent = content
        .replace(/```json\s*/, '') // Remove opening ```json
        .replace(/```\s*$/, '')    // Remove closing ```
        .trim()
      
      console.log('Cleaned content:', cleanedContent)
      
      // Parse the JSON response
      const policyData = JSON.parse(cleanedContent)
      
      // Construct the final policy object with proper typing
      const policy = {
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

      return policy
    } catch (parseError) {
      console.error(`Error parsing JSON response for ${country}:`, parseError)
      console.error('Raw content that failed to parse:', data.choices[0].message.content)
      throw new Error(`Failed to parse policy data for ${country}`)
    }
  } catch (error) {
    console.error(`Error processing policy for ${country}:`, error)
    throw error
  }
}
