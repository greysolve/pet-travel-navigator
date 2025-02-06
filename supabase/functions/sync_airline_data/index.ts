
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { SyncManager } from '../_shared/SyncManager.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    const syncManager = new SyncManager(supabaseUrl, supabaseKey, 'airlines')

    // Parse request body to get sync mode
    const { mode = 'clear' } = await req.json()
    console.log('Starting airline sync process in mode:', mode)

    // If in update mode, fetch airlines from missing_pet_policies view
    if (mode === 'update') {
      const { data: missingPolicies, error: missingPoliciesError } = await supabase
        .from('missing_pet_policies')
        .select('iata_code, name')

      if (missingPoliciesError) {
        console.error('Failed to fetch missing policies:', missingPoliciesError)
        throw missingPoliciesError
      }

      // Initialize sync progress with the count of airlines with missing policies
      await syncManager.initialize(missingPolicies?.length || 0)

      // Process each airline with missing policy
      for (const airline of missingPolicies || []) {
        if (!airline.iata_code) continue

        const fetchResponse = await fetch(
          `${supabaseUrl}/functions/v1/fetch_airlines`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ iataCode: airline.iata_code })
          }
        )

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text()
          console.error(`Failed to fetch airline ${airline.iata_code}:`, errorText)
          await syncManager.addErrorItem(airline.iata_code, errorText)
          continue
        }

        await syncManager.addProcessedItem(airline.iata_code)
      }
    } else {
      // Original full sync behavior
      const fetchAirlinesResponse = await fetch(
        `${supabaseUrl}/functions/v1/fetch_airlines`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!fetchAirlinesResponse.ok) {
        const errorText = await fetchAirlinesResponse.text()
        console.error('Failed to fetch airlines:', errorText)
        throw new Error(`Failed to fetch airlines: ${errorText}`)
      }

      const result = await fetchAirlinesResponse.json()
      console.log('Fetch airlines result:', result)
    }

    await syncManager.complete()

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Airlines sync completed successfully'
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    )
  } catch (error) {
    console.error('Error in sync_airline_data:', error)
    
    // Remove the cleanup on error - this is the key change
    // Just return the error response
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }), 
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    )
  }
})
