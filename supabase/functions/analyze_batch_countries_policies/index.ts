
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { corsHeaders } from './cors.ts';
import { processPolicyBatch } from './policyProcessor.ts';
import { ProcessingResponse } from '../_shared/types.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  const startTime = Date.now();
  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OPENAI_API_KEY is not set');
      throw new Error('API key configuration error');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Database configuration error');
    }

    const { countries } = await req.json();
    if (!Array.isArray(countries)) {
      throw new Error('Invalid input: countries must be an array');
    }

    // Log the countries we're about to process
    console.log(`Processing countries: ${countries.map(c => c.name).join(', ')}`);

    const { results, errors } = await processPolicyBatch(
      countries,
      openaiKey,
      supabaseUrl,
      supabaseKey
    );

    const response: ProcessingResponse = {
      success: true,
      results,
      errors,
      execution_time: Date.now() - startTime
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
