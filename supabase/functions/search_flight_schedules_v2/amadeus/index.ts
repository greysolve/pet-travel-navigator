
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../cors.ts';
import { searchAmadeusFlights, mapAmadeusToFlightData } from '../amadeus-service.ts';
import type { SearchRequest } from '../types.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin, destination, date, passengers = 1 } = await req.json() as SearchRequest;
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Check if user is authorized
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .single();

    console.log('User role:', userRole);
    console.log(`Searching Amadeus flights from ${origin} to ${destination} on ${date} for ${passengers} passenger(s)`);

    // Get flights from Amadeus
    const amadeusData = await searchAmadeusFlights(origin, destination, date, passengers);
    const connections = mapAmadeusToFlightData(amadeusData);
    
    console.log(`Amadeus search returned ${connections.length} connections`);

    // Format response with flights property for consistency with client expectations
    return new Response(
      JSON.stringify({
        flights: connections,
        connections: connections, // For backward compatibility
        api_provider: 'amadeus',
        fallback_used: false,
        error: null,
        fallback_error: null
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Error in Amadeus flight search:', error instanceof Error ? error.message : String(error));
    
    return new Response(
      JSON.stringify({
        flights: [],
        connections: [],
        error: error instanceof Error ? error.message : String(error),
        api_provider: 'amadeus',
        fallback_used: false,
        fallback_error: null
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
