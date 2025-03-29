
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from './cors.ts';
import { searchAmadeusFlights, mapAmadeusToFlightData } from './amadeus-service.ts';
import { searchCiriumFlights } from './cirium-service.ts';
import type { ApiProvider, SearchRequest, SearchResponse, FlightData } from './types.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin, destination, date, api = 'amadeus', enable_fallback = false } = await req.json() as SearchRequest;
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

    // Get app settings to check if there's an override
    const { data: appSettings } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'api_provider')
      .single();
      
    // Use the database setting if available, otherwise use the requested API
    let selectedApiProvider = api;
    let fallbackEnabled = enable_fallback;
    
    if (appSettings?.value) {
      console.log('Found API provider settings in database:', appSettings.value);
      selectedApiProvider = appSettings.value.provider || api;
      fallbackEnabled = appSettings.value.enable_fallback !== undefined ? 
        appSettings.value.enable_fallback : enable_fallback;
    }
    
    // Log which API we're using for this search
    console.log(`Using API provider: ${selectedApiProvider} (Fallback: ${fallbackEnabled ? 'Enabled' : 'Disabled'})`);
    
    let connections: FlightData[] = [];
    let actualApiProvider: ApiProvider | null = selectedApiProvider; // Track which API actually provided the data
    let originalError: Error | null = null; // Store the original error for fallback reporting
    let fallbackError: Error | null = null; // Store any fallback error
    
    // Try the selected API provider first
    try {
      if (selectedApiProvider === 'amadeus') {
        // Get flights from Amadeus
        const amadeusData = await searchAmadeusFlights(origin, destination, date);
        connections = mapAmadeusToFlightData(amadeusData);
        
        console.log(`Amadeus search returned ${connections.length} connections`);
      } else {
        // Use Cirium API
        const appId = Deno.env.get('CIRIUM_APP_ID');
        const appKey = Deno.env.get('CIRIUM_APP_KEY');
        
        if (!appId || !appKey) {
          throw new Error('Missing Cirium API credentials');
        }
        
        connections = await searchCiriumFlights(origin, destination, date, appId, appKey);
        console.log(`Cirium search returned ${connections.length} connections`);
      }
    } catch (error) {
      // Store the original error
      originalError = error instanceof Error ? error : new Error(String(error));
      console.error(`Error with ${selectedApiProvider} search:`, originalError.message);
      
      // Try fallback if enabled
      if (fallbackEnabled) {
        const fallbackProvider = selectedApiProvider === 'amadeus' ? 'cirium' : 'amadeus';
        console.log(`Fallback is enabled, trying ${fallbackProvider} API`);
        
        try {
          if (fallbackProvider === 'amadeus') {
            const amadeusData = await searchAmadeusFlights(origin, destination, date);
            connections = mapAmadeusToFlightData(amadeusData);
            actualApiProvider = 'amadeus';
            console.log(`Fallback to Amadeus returned ${connections.length} connections`);
          } else {
            const appId = Deno.env.get('CIRIUM_APP_ID');
            const appKey = Deno.env.get('CIRIUM_APP_KEY');
            
            if (!appId || !appKey) {
              throw new Error('Missing Cirium API credentials for fallback');
            }
            
            connections = await searchCiriumFlights(origin, destination, date, appId, appKey);
            actualApiProvider = 'cirium';
            console.log(`Fallback to Cirium returned ${connections.length} connections`);
          }
        } catch (error) {
          // Store the fallback error
          fallbackError = error instanceof Error ? error : new Error(String(error));
          console.error(`Fallback to ${fallbackProvider} also failed:`, fallbackError.message);
          
          // Both primary and fallback failed, throw a comprehensive error
          throw new Error(
            `Primary API (${selectedApiProvider}) failed: ${originalError.message}. ` +
            `Fallback API (${fallbackProvider}) also failed: ${fallbackError.message}`
          );
        }
      } else {
        // Fallback is disabled, re-throw the original error
        throw new Error(`${selectedApiProvider} API error: ${originalError.message}`);
      }
    }

    const response: SearchResponse = {
      connections,
      api_provider: actualApiProvider,
      fallback_used: actualApiProvider !== selectedApiProvider,
      error: originalError ? originalError.message : null,
      fallback_error: fallbackError ? fallbackError.message : null
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );

  } catch (error) {
    console.error('Error in flight schedule search:', error instanceof Error ? error.message : String(error));
    
    const errorResponse: SearchResponse = {
      error: error instanceof Error ? error.message : String(error),
      connections: [],
      api_provider: null,
      fallback_used: false,
      fallback_error: null
    };
    
    return new Response(
      JSON.stringify(errorResponse),
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
