import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  console.log('Request received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  })

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Cache-Control': 'no-store'
      }
    })
  }

  try {
    // Initialize Supabase client with error handling
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

    // Get unique countries from airports
    const uniqueCountries = [...new Set(airports.map(a => a.country).filter(Boolean))]
    console.log(`Found ${uniqueCountries.length} unique countries to process:`, uniqueCountries)

    let processedCount = 0
    let errorCount = 0

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
                errorCount++
              } else {
                processedCount++
                console.log(`Successfully processed ${policyType} policy for ${country}`)
              }
            } catch (error) {
              console.error(`Error processing ${policyType} policy for ${country}:`, error)
              errorCount++
            }
          }
        } catch (error) {
          console.error(`Error processing country ${country}:`, error)
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
      policies_processed: processedCount,
      errors: errorCount,
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

  const prompt = `What are the current ${policyType === 'pet' ? 'pet' : 'live animal'} import requirements and policies for ${country}? 
    Please structure your response to include:
    - Title (one line summary)
    - Description (2-3 sentences overview)
    - Key Requirements (list)
    - Required Documentation (list)
    - Fees (if applicable)
    - Restrictions (if any)
    - Quarantine Requirements (if any)
    - Vaccination Requirements (list)
    - Additional Notes
    
    Focus on official government regulations and be precise.`

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
            content: 'You are a helpful assistant that provides accurate information about animal import regulations. Be precise and concise.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
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
    const content = data.choices[0].message.content

    // Parse the AI response into structured data
    const lines = content.split('\n')
    const policy: any = {
      country_code: country,
      policy_type: policyType,
      title: '',
      description: '',
      requirements: [],
      documentation_needed: [],
      fees: {},
      restrictions: {},
      quarantine_requirements: '',
      vaccination_requirements: [],
      additional_notes: '',
      last_updated: new Date().toISOString(),
    }

    let currentSection = ''
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      if (trimmedLine.toLowerCase().includes('title:')) {
        policy.title = trimmedLine.split(':')[1]?.trim() || `${country} ${policyType} Import Requirements`
      } else if (trimmedLine.toLowerCase().includes('description:')) {
        policy.description = trimmedLine.split(':')[1]?.trim()
      } else if (trimmedLine.toLowerCase().includes('requirements:') || trimmedLine.toLowerCase().includes('key requirements:')) {
        currentSection = 'requirements'
      } else if (trimmedLine.toLowerCase().includes('documentation:') || trimmedLine.toLowerCase().includes('required documentation:')) {
        currentSection = 'documentation'
      } else if (trimmedLine.toLowerCase().includes('fees:')) {
        currentSection = 'fees'
        const feesText = trimmedLine.split(':')[1]?.trim()
        if (feesText) {
          policy.fees = { general: feesText }
        }
      } else if (trimmedLine.toLowerCase().includes('restrictions:')) {
        currentSection = 'restrictions'
        const restrictionsText = trimmedLine.split(':')[1]?.trim()
        if (restrictionsText) {
          policy.restrictions = { general: restrictionsText }
        }
      } else if (trimmedLine.toLowerCase().includes('quarantine:')) {
        policy.quarantine_requirements = trimmedLine.split(':')[1]?.trim()
      } else if (trimmedLine.toLowerCase().includes('vaccination:')) {
        currentSection = 'vaccination'
      } else if (trimmedLine.toLowerCase().includes('additional notes:')) {
        currentSection = 'notes'
      } else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || /^\d+\./.test(trimmedLine)) {
        const item = trimmedLine.replace(/^[-•\d.]+/, '').trim()
        if (currentSection === 'requirements') {
          policy.requirements.push(item)
        } else if (currentSection === 'documentation') {
          policy.documentation_needed.push(item)
        } else if (currentSection === 'vaccination') {
          policy.vaccination_requirements.push(item)
        } else if (currentSection === 'notes') {
          policy.additional_notes += item + ' '
        }
      }
    }

    // If we haven't found a title, use a default one
    if (!policy.title) {
      policy.title = `${country} Pet Import Requirements and Regulations`
    }

    // If we haven't found a description, generate one
    if (!policy.description) {
      policy.description = `Official pet import requirements and regulations for ${country}. These requirements must be followed when bringing pets into the country.`
    }

    return policy
  } catch (error) {
    console.error(`Error processing policy for ${country}:`, error)
    throw error
  }
}