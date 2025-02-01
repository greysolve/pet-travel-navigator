import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { SyncProgressManager } from '../_shared/syncProgress.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BATCH_SIZE = 10;

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
    console.error(`Error in fetchPolicyWithAI for ${country}:`, error)
    throw error
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const requestBody = await req.json().catch(() => ({}))
    console.log('Received request with body:', requestBody)
    
    const {
      lastProcessedItem,
      currentProcessed = 0,
      currentTotal = 0,
      processedItems = [],
      errorItems = [],
      startTime,
      batchSize = BATCH_SIZE
    } = requestBody

    // Fetch countries
    const { data: countries, error: countriesError } = await supabase
      .rpc('get_distinct_countries')
    
    if (countriesError) {
      console.error('Error fetching countries:', countriesError)
      throw countriesError
    }
    
    if (!countries?.length) {
      console.error('No countries found')
      throw new Error('No countries found')
    }

    const uniqueCountries = countries
      .map(row => row.country?.trim() || '')
      .filter(country => country !== '')
      .map(country => country.normalize('NFKC').trim())
      .sort()

    const total = uniqueCountries.length
    const startIndex = lastProcessedItem
      ? uniqueCountries.findIndex(c => c === lastProcessedItem) + 1
      : 0

    console.log(`Processing batch of ${batchSize} countries starting from index ${startIndex}`)
    const endIndex = Math.min(startIndex + batchSize, uniqueCountries.length)
    const batchCountries = uniqueCountries.slice(startIndex, endIndex)
    
    const newProcessedItems = [...processedItems]
    const newErrorItems = [...errorItems]

    for (const country of batchCountries) {
      try {
        console.log(`Processing country: ${country}`)
        const policy = await fetchPolicyWithAI(country, 'pet')
        
        const { error: upsertError } = await supabase
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
          newErrorItems.push(country)
        } else {
          newProcessedItems.push(country)
        }
      } catch (error) {
        console.error(`Error processing country ${country}:`, error)
        newErrorItems.push(country)
        
        if (error.message?.includes('rate limit') || error.message?.includes('quota exceeded')) {
          console.log('Rate limit or quota reached, stopping batch')
          return new Response(
            JSON.stringify({
              success: true,
              total,
              processed: currentProcessed + newProcessedItems.length,
              processed_items: newProcessedItems,
              error_items: newErrorItems,
              continuation_token: country
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Add a small delay between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const hasMoreCountries = endIndex < uniqueCountries.length
    const continuationToken = hasMoreCountries ? uniqueCountries[endIndex - 1] : null

    return new Response(
      JSON.stringify({
        success: true,
        total,
        processed: currentProcessed + newProcessedItems.length,
        processed_items: newProcessedItems,
        error_items: newErrorItems,
        continuation_token: continuationToken
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in sync_country_policies:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})