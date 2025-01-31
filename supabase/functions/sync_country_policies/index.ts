import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Edge Function: sync_country_policies initialized')

const BATCH_SIZE = 10 // Process countries in batches of 10
const RATE_LIMIT_DELAY = 1000 // 1 second delay between API calls

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper function to process a batch of countries
async function processBatch(
  countries: string[], 
  supabaseClient: any,
  startIndex: number
): Promise<{ processed: string[], errors: string[] }> {
  console.log(`Processing batch starting at index ${startIndex}`)
  const processed: string[] = []
  const errors: string[] = []

  for (let i = 0; i < BATCH_SIZE && (startIndex + i) < countries.length; i++) {
    const country = countries[startIndex + i]
    try {
      console.log(`Processing country ${startIndex + i + 1}/${countries.length}: ${country}`)
      
      const policy = await fetchPolicyWithAI(country, 'pet')
      console.log(`Policy data received for ${country}:`, policy)

      const { error: upsertError } = await supabaseClient
        .from('country_policies')
        .upsert({
          country_code: country,
          policy_type: 'pet',
          ...policy,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'country_code,policy_type'
        })

      if (upsertError) {
        console.error(`Error upserting policy for ${country}:`, upsertError)
        errors.push(country)
      } else {
        processed.push(country)
        console.log(`Successfully processed policy for ${country}`)
      }

      // Rate limiting delay between API calls
      await delay(RATE_LIMIT_DELAY)
    } catch (error) {
      console.error(`Error processing country ${country}:`, error)
      errors.push(country)
    }
  }

  return { processed, errors }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    })
  }

  try {
    console.log('Request received:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    })

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

    // Get unique countries
    const { data: countries, error: countriesError } = await supabaseClient
      .rpc('get_distinct_countries')

    if (countriesError) {
      console.error('Error fetching countries:', countriesError)
      throw countriesError
    }

    if (!countries || !Array.isArray(countries)) {
      throw new Error('Invalid response from get_distinct_countries')
    }

    console.log('Total countries fetched:', countries.length)

    // Process all countries (removed the slice)
    const uniqueCountries = countries
      .map(row => row.country?.trim() || '')
      .filter(country => country !== '')
      .map(country => country.normalize('NFKC').trim())
      .sort()

    console.log('Processing countries:', uniqueCountries)
    
    const processedCountries = new Set<string>()
    const errorCountries = new Set<string>()

    // Process countries in batches
    for (let i = 0; i < uniqueCountries.length; i += BATCH_SIZE) {
      console.log(`Starting batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(uniqueCountries.length/BATCH_SIZE)}`)
      
      const { processed, errors } = await processBatch(
        uniqueCountries,
        supabaseClient,
        i
      )

      processed.forEach(country => processedCountries.add(country))
      errors.forEach(country => errorCountries.add(country))

      // Log progress after each batch
      console.log(`Progress: ${processedCountries.size}/${uniqueCountries.length} countries processed`)
    }

    const summary = {
      success: true,
      total_countries: uniqueCountries.length,
      processed_policies: processedCountries.size,
      errors: errorCountries.size,
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

  let retries = 3
  while (retries > 0) {
    try {
      console.log(`Making API request to Perplexity for ${country} (attempt ${4 - retries}/3)...`)
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
      console.error(`Attempt ${4 - retries}/3 failed for ${country}:`, error)
      retries--
      if (retries === 0) throw error
      await delay(2000) // Wait 2 seconds before retrying
    }
  }

  throw new Error(`Failed to fetch policy for ${country} after 3 attempts`)
}