import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { origin, destination, date } = await req.json()
    console.log('Searching flights for:', { origin, destination, date });

    const appId = Deno.env.get('CIRIUM_APP_ID')
    const appKey = Deno.env.get('CIRIUM_APP_KEY')

    if (!appId || !appKey) {
      throw new Error('Missing Cirium API credentials')
    }

    // Parse the date into components
    const searchDate = new Date(date)
    const year = searchDate.getUTCFullYear()
    const month = searchDate.getUTCMonth() + 1 // getMonth() returns 0-11
    const day = searchDate.getUTCDate()
    const hour = 14 // Set to 2 PM UTC to catch most departures
    const minute = 0

    // Use the connections API instead of schedules
    const url = `https://api.flightstats.com/flex/connections/rest/v3/json/firstflightout/${origin}/to/${destination}/leaving_after/${year}/${month}/${day}/${hour}/${minute}?appId=${appId}&appKey=${appKey}&maxConnections=2&numHours=24&maxResults=25`

    console.log('Fetching from Cirium API with URL:', url);
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('Cirium API error:', response.status, response.statusText);
      throw new Error(`Cirium API error: ${response.statusText}`);
    }
    
    const data = await response.json()
    console.log('Raw Cirium API response:', JSON.stringify(data));

    // Transform the connections data into our expected format
    if (data.connections) {
      const flights = data.connections.map((connection: any) => {
        const legs = connection.scheduledFlight;
        const mainFlight = legs[0];
        const airline = data.appendix?.airlines?.find((a: any) => a.fs === mainFlight.carrierFsCode);

        // If this is a multi-leg journey, process connections
        if (legs.length > 1) {
          const connections = legs.slice(1).map((leg: any) => {
            const connectionAirline = data.appendix?.airlines?.find((a: any) => a.fs === leg.carrierFsCode);
            return {
              carrierFsCode: leg.carrierFsCode,
              flightNumber: leg.flightNumber,
              departureTime: leg.departureTime,
              arrivalTime: leg.arrivalTime,
              arrivalCountry: leg.arrivalAirportFsCode === destination ? data.appendix?.airports?.find((a: any) => a.fs === destination)?.countryCode : undefined,
              airlineName: connectionAirline?.name,
              departureAirport: leg.departureAirportFsCode,
              arrivalAirport: leg.arrivalAirportFsCode,
              stops: leg.stops,
              elapsedTime: leg.elapsedTime
            };
          });

          return {
            carrierFsCode: mainFlight.carrierFsCode,
            flightNumber: mainFlight.flightNumber,
            departureTime: mainFlight.departureTime,
            arrivalTime: mainFlight.arrivalTime,
            airlineName: airline?.name,
            connections: connections,
            totalDuration: connection.elapsedTime,
            stops: mainFlight.stops
          };
        }

        // For direct flights
        return {
          carrierFsCode: mainFlight.carrierFsCode,
          flightNumber: mainFlight.flightNumber,
          departureTime: mainFlight.departureTime,
          arrivalTime: mainFlight.arrivalTime,
          arrivalCountry: data.appendix?.airports?.find((a: any) => a.fs === destination)?.countryCode,
          airlineName: airline?.name,
          stops: mainFlight.stops
        };
      });

      data.scheduledFlights = flights;
    }

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