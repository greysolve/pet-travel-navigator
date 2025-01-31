import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting country policies sync...')

    // Example policy data - in a real implementation, this would come from an external API
    const samplePolicies = [
      {
        country_code: 'US',
        policy_type: 'pet',
        title: 'US Pet Import Requirements',
        description: 'Requirements for bringing pets into the United States',
        requirements: ['Valid rabies vaccination', 'Health certificate'],
        documentation_needed: ['Rabies certificate', 'USDA endorsement'],
        fees: { 
          inspection: 100,
          processing: 50
        },
        restrictions: {
          prohibited_breeds: ['Pit Bull (some states)'],
          age_minimum: '4 months'
        },
        quarantine_requirements: 'No quarantine required if documentation is complete',
        vaccination_requirements: ['Rabies'],
        additional_notes: 'Requirements may vary by state'
      },
      // Add more sample policies as needed
    ]

    // Insert or update policies
    const { error } = await supabaseClient
      .from('country_policies')
      .upsert(samplePolicies, {
        onConflict: 'country_code,policy_type'
      })

    if (error) throw error

    console.log('Country policies sync completed successfully')

    return new Response(
      JSON.stringify({ message: 'Country policies synchronized successfully' }),
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