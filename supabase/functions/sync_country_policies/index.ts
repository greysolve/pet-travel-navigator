import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchPolicyWithAI(country: string, policyType: 'pet' | 'live_animal') {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY')
  if (!PERPLEXITY_API_KEY) {
    throw new Error('Missing Perplexity API key')
  }

  console.log(`Starting AI policy fetch for ${country} (${policyType})`)

  const prompt = `What are the current ${policyType === 'pet' ? 'pet' : 'live animal'} import requirements and policies for ${country}? 
    Please structure your response to include:
    - Title
    - Description (brief overview)
    - Key Requirements (list)
    - Required Documentation (list)
    - Any Fees (if applicable)
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
    }

    let currentSection = ''
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      if (trimmedLine.toLowerCase().includes('title:')) {
        policy.title = trimmedLine.split(':')[1]?.trim() || `${country} ${policyType} Import Requirements`
      } else if (trimmedLine.toLowerCase().includes('description:')) {
        policy.description = trimmedLine.split(':')[1]?.trim()
      } else if (trimmedLine.toLowerCase().includes('requirements:')) {
        currentSection = 'requirements'
      } else if (trimmedLine.toLowerCase().includes('documentation:')) {
        currentSection = 'documentation'
      } else if (trimmedLine.toLowerCase().includes('fees:')) {
        currentSection = 'fees'
        policy.fees = { general: trimmedLine.split(':')[1]?.trim() || 'Varies by case' }
      } else if (trimmedLine.toLowerCase().includes('restrictions:')) {
        currentSection = 'restrictions'
        policy.restrictions = { general: trimmedLine.split(':')[1]?.trim() || 'Contact authorities for details' }
      } else if (trimmedLine.toLowerCase().includes('quarantine:')) {
        policy.quarantine_requirements = trimmedLine.split(':')[1]?.trim()
      } else if (trimmedLine.toLowerCase().includes('vaccination:')) {
        currentSection = 'vaccination'
      } else if (trimmedLine.toLowerCase().includes('additional notes:')) {
        currentSection = 'notes'
      } else if (trimmedLine.startsWith('-')) {
        const item = trimmedLine.substring(1).trim()
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

    return policy
  } catch (error) {
    console.error(`Error fetching policy for ${country}:`, error)
    throw error
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting country policies sync process...')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Fetching airlines from database...')
    const { data: airlines, error: airlinesError } = await supabaseClient
      .from('airlines')
      .select('country')
      .not('country', 'is', null)

    if (airlinesError) {
      console.error('Error fetching airlines:', airlinesError)
      throw airlinesError
    }

    console.log('Raw airlines data count:', airlines?.length)
    console.log('Sample of first few airlines:', airlines?.slice(0, 5))

    // Get unique countries
    const countries = [...new Set(airlines.map(a => a.country).filter(Boolean))]
    console.log(`Found ${countries.length} unique countries to process:`, countries.slice(0, 5))

    if (countries.length === 0) {
      console.log('No countries found in airlines table after filtering')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No valid countries found in airlines table'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    let processedCount = 0
    let errorCount = 0

    // Process countries in batches to avoid rate limits
    const BATCH_SIZE = 5
    for (let i = 0; i < countries.length; i += BATCH_SIZE) {
      const batch = countries.slice(i, i + BATCH_SIZE)
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(countries.length/BATCH_SIZE)}...`)
      
      for (const country of batch) {
        try {
          console.log(`Starting processing for country: ${country}`)
          const policyTypes: Array<'pet' | 'live_animal'> = ['pet', 'live_animal']
          
          for (const policyType of policyTypes) {
            try {
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
      if (i + BATCH_SIZE < countries.length) {
        console.log('Waiting before processing next batch...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    const summary = {
      success: true,
      total_countries: countries.length,
      policies_processed: processedCount,
      errors: errorCount,
    }

    console.log('Country policies sync completed:', summary)

    return new Response(
      JSON.stringify(summary),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in sync_country_policies:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})