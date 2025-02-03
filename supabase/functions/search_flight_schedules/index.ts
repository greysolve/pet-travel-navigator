import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { origin, destination, date } = await req.json()
    console.log('Searching flights for:', { origin, destination, date });

    const appId = Deno.env.get('CIRIUM_APP_ID')
    const appKey = Deno.env.get('CIRIUM_APP_KEY')

    if (!appId || !appKey) {
      throw new Error('Missing Cirium API credentials')
    }

    // Format the date as YYYY/MM/DD for Cirium API
    const formattedDate = new Date(date).toISOString().split('T')[0].replace(/-/g, '/')

    // Construct Cirium API URL - now including maxConnections parameter
    const url = `https://api.flightstats.com/flex/schedules/rest/v1/json/from/${origin}/to/${destination}/departing/${formattedDate}?appId=${appId}&appKey=${appKey}&maxConnections=2`

    console.log('Fetching from Cirium API...');
    const response = await fetch(url)
    const data = await response.json()

    console.log('Processing flight connections...');
    
    // Process the response to include connection information
    if (data.scheduledFlights) {
      data.scheduledFlights = data.scheduledFlights.map((flight: any) => {
        if (flight.codeshares) {
          flight.codeshares = flight.codeshares.map((codeshare: any) => ({
            ...codeshare,
            airlineName: data.appendix?.airlines?.find((a: any) => a.fs === codeshare.carrierFsCode)?.name
          }));
        }
        
        // Add connection details if present
        if (flight.connections) {
          flight.connections = flight.connections.map((connection: any) => ({
            ...connection,
            airlineName: data.appendix?.airlines?.find((a: any) => a.fs === connection.carrierFsCode)?.name,
            arrivalCountry: data.appendix?.airports?.find((a: any) => a.fs === connection.arrivalAirportFsCode)?.countryCode
          }));
        }

        return {
          ...flight,
          airlineName: data.appendix?.airlines?.find((a: any) => a.fs === flight.carrierFsCode)?.name,
          arrivalCountry: data.appendix?.airports?.find((a: any) => a.fs === flight.arrivalAirportFsCode)?.countryCode
        };
      });
    }

    console.log('Received and processed response from Cirium API');

    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )

  } catch (error) {
    console.error('Error in flight schedule search:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  }
})