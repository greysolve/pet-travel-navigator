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

    // Construct Cirium API URL with extended parameters
    const url = `https://api.flightstats.com/flex/schedules/rest/v1/json/from/${origin}/to/${destination}/departing/${formattedDate}?appId=${appId}&appKey=${appKey}&maxConnections=2&extendedOptions=includeCodeshares,useInlinedReferences`

    console.log('Fetching from Cirium API with URL:', url);
    const response = await fetch(url)
    const data = await response.json()
    
    console.log('Raw Cirium API response:', JSON.stringify(data));

    // Process the response to include connection information
    if (data.scheduledFlights) {
      data.scheduledFlights = data.scheduledFlights.map((flight: any) => {
        // Process codeshares
        if (flight.codeshares) {
          flight.codeshares = flight.codeshares.map((codeshare: any) => ({
            ...codeshare,
            airlineName: data.appendix?.airlines?.find((a: any) => a.fs === codeshare.carrierFsCode)?.name
          }));
        }
        
        // Process connections with more detail
        if (flight.connections) {
          flight.connections = flight.connections.map((connection: any) => {
            const airline = data.appendix?.airlines?.find((a: any) => a.fs === connection.carrierFsCode);
            const arrivalAirport = data.appendix?.airports?.find((a: any) => a.fs === connection.arrivalAirportFsCode);
            const departureAirport = data.appendix?.airports?.find((a: any) => a.fs === connection.departureAirportFsCode);
            
            return {
              ...connection,
              airlineName: airline?.name,
              arrivalCountry: arrivalAirport?.countryCode,
              departureCountry: departureAirport?.countryCode,
              connectionAirport: connection.departureAirportFsCode, // Add connection airport code
              connectionDuration: connection.elapsedTime // Add connection duration if available
            };
          });
        }

        // Add main flight details
        const airline = data.appendix?.airlines?.find((a: any) => a.fs === flight.carrierFsCode);
        const arrivalAirport = data.appendix?.airports?.find((a: any) => a.fs === flight.arrivalAirportFsCode);
        const departureAirport = data.appendix?.airports?.find((a: any) => a.fs === flight.departureAirportFsCode);

        return {
          ...flight,
          airlineName: airline?.name,
          arrivalCountry: arrivalAirport?.countryCode,
          departureCountry: departureAirport?.countryCode,
          totalDuration: flight.elapsedTime // Add total flight duration
        };
      });
    }

    console.log('Processed flight data:', JSON.stringify(data.scheduledFlights));

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