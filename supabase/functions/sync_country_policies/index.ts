import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Edge Function: sync_country_policies initialized')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Cache-Control': 'no-store'
      }
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

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
    
    console.log('Fetching unique countries from airports table...')
    const { data: airports, error: airportsError } = await supabaseClient
      .from('airports')
      .select('country')
      .not('country', 'is', null)
      .order('country')

    if (airportsError) {
      console.error('Error fetching airports:', airportsError)
      throw airportsError
    }

    // Log raw airport data to see all countries
    console.log('Raw airport countries data:', airports.map(a => a.country))

    // Get unique countries and log the process
    const countrySet = new Set(airports.map(a => a.country).filter(Boolean))
    console.log('Unique countries before processing:', Array.from(countrySet))

    // Convert to array and sort
    const uniqueCountries = Array.from(countrySet).sort()
    console.log(`Found ${uniqueCountries.length} unique countries to process:`, uniqueCountries)

    let processedCount = 0
    let errorCount = 0
    let skippedCount = 0
    const processedCountries = new Set()
    const skippedCountries = new Set()
    const errorCountries = new Set()

    // Process countries in batches to avoid rate limits
    const BATCH_SIZE = 5
    for (let i = 0; i < uniqueCountries.length; i += BATCH_SIZE) {
      const batch = uniqueCountries.slice(i, i + BATCH_SIZE)
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(uniqueCountries.length/BATCH_SIZE)}...`)
      
      for (const country of batch) {
        try {
          console.log(`Starting processing for country: ${country}`)
          const policyTypes: Array<'pet' | 'live_animal'> = ['pet', 'live_animal']
          
          for (const policyType of policyTypes) {
            try {
              // Check if policy already exists and is recent
              const { data: existingPolicies } = await supabaseClient
                .from('country_policies')
                .select('last_updated')
                .eq('country_code', country)
                .eq('policy_type', policyType)
                .single()

              // Skip if policy is less than 7 days old
              if (existingPolicies?.last_updated) {
                const lastUpdated = new Date(existingPolicies.last_updated)
                const daysSinceUpdate = (new Date().getTime() - lastUpdated.getTime()) / (1000 * 3600 * 24)
                if (daysSinceUpdate < 7) {
                  console.log(`Skipping ${country} ${policyType} policy - updated ${daysSinceUpdate.toFixed(1)} days ago`)
                  skippedCountries.add(country)
                  skippedCount++
                  continue
                }
              }

              console.log(`Fetching ${policyType} policy for ${country}...`)
              const policy = await fetchPolicyWithAI(country, policyType)

              console.log(`Upserting policy for ${country} (${policyType})...`)
              const { error: upsertError } = await supabaseClient
                .from('country_policies')
                .upsert(policy, {
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

      // Add a delay between batches to respect rate limits
      if (i + BATCH_SIZE < uniqueCountries.length) {
        console.log('Waiting before processing next batch...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    const summary = {
      success: true,
      total_countries: uniqueCountries.length,
      processed: processedCount,
      skipped: skippedCount,
      errors: errorCount,
      processed_countries: Array.from(processedCountries),
      skipped_countries: Array.from(skippedCountries),
      error_countries: Array.from(errorCountries)
    }

    console.log('Country policies sync completed:', summary)

    return new Response(
      JSON.stringify(summary),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

  const prompt = `Generate a JSON object containing the current ${policyType === 'pet' ? 'pet' : 'live animal'} import requirements and policies for ${country}.
    Return ONLY a valid JSON object with the following structure:
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
    }
    Be precise and ensure the response is a valid JSON object.`

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
          {
            role: 'system',
            content: 'You are a JSON generator that returns valid JSON objects containing animal import regulations. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Lower temperature for more consistent JSON formatting
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
      const content = data.choices[0].message.content
      console.log('Raw AI response:', content)
      
      // Parse the JSON response
      const policyData = JSON.parse(content)
      
      // Construct the final policy object with proper typing
      const policy = {
        country_code: country,
        policy_type: policyType,
        title: policyData.title || `${country} ${policyType === 'pet' ? 'Pet' : 'Live Animal'} Import Requirements`,
        description: policyData.description || `Official ${policyType === 'pet' ? 'pet' : 'live animal'} import requirements and regulations for ${country}.`,
        requirements: Array.isArray(policyData.requirements) ? policyData.requirements : [],
        documentation_needed: Array.isArray(policyData.documentation_needed) ? policyData.documentation_needed : [],
        fees: typeof policyData.fees === 'object' ? policyData.fees : {},
        restrictions: typeof policyData.restrictions === 'object' ? policyData.restrictions : {},
        quarantine_requirements: policyData.quarantine_requirements || '',
        vaccination_requirements: Array.isArray(policyData.vaccination_requirements) ? policyData.vaccination_requirements : [],
        additional_notes: policyData.additional_notes || '',
        last_updated: new Date().toISOString(),
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
