
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../cors.ts';
import { searchCiriumFlights } from '../cirium-service.ts';
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
    console.log(`Searching Cirium flights from ${origin} to ${destination} on ${date}`);

    // Use Cirium API
    const appId = Deno.env.get('CIRIUM_APP_ID');
    const appKey = Deno.env.get('CIRIUM_APP_KEY');
    
    if (!appId || !appKey) {
      throw new Error('Missing Cirium API credentials');
    }
    
    const connections = await searchCiriumFlights(origin, destination, date, appId, appKey);
    console.log(`Cirium search returned ${connections.length} connections`);

    // Format response with flights property for consistency with client expectations
    return new Response(
      JSON.stringify({
        flights: connections,
        connections: connections, // For backward compatibility
        api_provider: 'cirium',
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
    console.error('Error in Cirium flight search:', error instanceof Error ? error.message : String(error));
    
    return new Response(
      JSON.stringify({
        flights: [],
        connections: [],
        error: error instanceof Error ? error.message : String(error),
        api_provider: 'cirium',
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
