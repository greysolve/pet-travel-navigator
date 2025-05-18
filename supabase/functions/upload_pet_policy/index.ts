
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const data = await req.json();
    const { airlineId, policyData } = data;

    if (!airlineId || !policyData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate airline exists
    const { data: airline, error: airlineError } = await supabase
      .from('airlines')
      .select('id, name, iata_code')
      .eq('id', airlineId)
      .single();

    if (airlineError || !airline) {
      return new Response(
        JSON.stringify({ error: 'Airline not found', details: airlineError }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract policy details from the JSON structure
    const {
      airline_info,
      pet_policy: {
        allowed_pets,
        size_weight_restrictions,
        carrier_requirements,
        documentation_needed,
        fees,
        temperature_breed_restrictions
      }
    } = policyData;

    // Prepare data for pet_policies table
    const petPolicyData = {
      airline_id: airlineId,
      pet_types_allowed: allowed_pets || [],
      size_restrictions: size_weight_restrictions || {},
      carrier_requirements_cabin: carrier_requirements?.in_cabin || null,
      carrier_requirements_cargo: carrier_requirements?.cargo || null,
      documentation_needed: documentation_needed || [],
      fees: fees || {},
      temperature_restrictions: temperature_breed_restrictions?.temperature || null,
      breed_restrictions: temperature_breed_restrictions?.breed || [],
      policy_url: airline_info?.pet_policy_url || null,
    };

    // Update airline website if provided
    if (airline_info?.official_website) {
      const { error: updateError } = await supabase
        .from('airlines')
        .update({ 
          website: airline_info.official_website,
          last_policy_update: new Date().toISOString()
        })
        .eq('id', airlineId);

      if (updateError) {
        throw updateError;
      }
    }

    // Upsert pet policy
    const { data: result, error: policyError } = await supabase
      .from('pet_policies')
      .upsert(petPolicyData, { onConflict: 'airline_id' })
      .select();

    if (policyError) {
      throw policyError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Pet policy updated successfully', 
        airline: airline.name,
        airline_code: airline.iata_code,
        result 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error uploading pet policy:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to upload pet policy', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
