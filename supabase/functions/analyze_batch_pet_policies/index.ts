
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'
import { analyzePetPolicy } from './openAIClient.ts'
import { savePetPolicyToDatabase } from './databaseHandler.ts'
import { Airline, ProcessingResponse, ProcessingResult, ProcessingError } from './types.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      },
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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { airlines } = await req.json();
    if (!Array.isArray(airlines)) {
      throw new Error('Invalid input: airlines must be an array');
    }

    console.log(`Processing batch of ${airlines.length} airlines`);
    const results: ProcessingResult[] = [];
    const errors: ProcessingError[] = [];
    let rawApiResponse = null;
    let contentChanged = false;
    let comparisonDetails = null;

    for (const airline of airlines) {
      try {
        console.log(`Processing airline: ${airline.name}`);
        const petPolicy = await analyzePetPolicy(airline, openaiKey);
        
        // Store raw API response for debugging
        rawApiResponse = petPolicy._raw_api_response; 
        delete petPolicy._raw_api_response; // Remove from policy object before saving
        
        // Save to database and get detailed results
        const saveResult = await savePetPolicyToDatabase(
          supabase, 
          airline, 
          petPolicy, 
          rawApiResponse
        );
        
        contentChanged = saveResult.content_changed;
        comparisonDetails = saveResult.comparison_details;

        // If we reach here, processing was successful
        results.push({
          airline_id: airline.id,
          success: true,
          iata_code: airline.iata_code,
          content_changed: contentChanged
        });
        
        console.log(`Successfully processed ${airline.name} (${airline.iata_code})`);

        // Add delay between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing ${airline.name}:`, error);
        errors.push({
          airline_id: airline.id,
          error: error.message,
          iata_code: airline.iata_code
        });
      }
    }

    const executionTime = Date.now() - startTime;
    const response: ProcessingResponse = {
      success: results.length > 0, // Consider success if at least one airline was processed
      results,
      errors,
      execution_time: executionTime,
      raw_api_response: rawApiResponse,
      content_changed: contentChanged,
      comparison_details: comparisonDetails
    };
    
    console.log(`Batch processing complete. Success: ${response.success}, Results: ${results.length}, Errors: ${errors.length}, Content changed: ${contentChanged}`);
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

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
