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

    console.log('Starting airline sync process...')

    // First, fetch airlines from the fetch_airlines function
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

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Airlines sync completed successfully',
        result
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
    
    // Clean up on error
    const syncManager = new SyncManager(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      'airlines'
    );
    await syncManager.cleanup();

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