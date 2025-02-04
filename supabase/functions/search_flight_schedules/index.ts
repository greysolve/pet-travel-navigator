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
    console.log('Search request received for:', { origin, destination, date });

    const appId = Deno.env.get('CIRIUM_APP_ID')
    const appKey = Deno.env.get('CIRIUM_APP_KEY')

    if (!appId || !appKey) {
      throw new Error('Missing Cirium API credentials')
    }

    // Parse the date into components
    const searchDate = new Date(date)
    const year = searchDate.getUTCFullYear()
    const month = searchDate.getUTCMonth() + 1
    const day = searchDate.getUTCDate()
    const hour = 14
    const minute = 0

    console.log('Parsed search date components:', { year, month, day, hour, minute });

    const url = `https://api.flightstats.com/flex/connections/rest/v3/json/firstflightout/${origin}/to/${destination}/leaving_after/${year}/${month}/${day}/${hour}/${minute}?appId=${appId}&appKey=${appKey}&maxConnections=2&numHours=24&maxResults=25`

    console.log('Fetching from Cirium API with URL:', url);
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('Cirium API error:', response.status, response.statusText);
      console.error('Error response:', await response.text());
      throw new Error(`Cirium API error: ${response.statusText}`);
    }
    
    const data = await response.json()
    console.log('Raw Cirium API response:', JSON.stringify(data));
    console.log('Number of connections found:', data.connections?.length || 0);

    // Transform the connections data into our expected format
    if (data.connections) {
      console.log('Processing connections data');
      const flights = data.connections.map((connection: any) => {
        const legs = connection.scheduledFlight;
        console.log('Processing connection:', {
          totalLegs: legs?.length || 0,
          elapsedTime: connection.elapsedTime,
          firstLegCarrier: legs?.[0]?.carrierFsCode,
          lastLegCarrier: legs?.[legs?.length - 1]?.carrierFsCode
        });

        if (!legs || legs.length === 0) {
          console.log('No legs found for this connection, skipping');
          return null;
        }

        // Get the main (first) flight
        const mainFlight = legs[0];
        const mainAirline = data.appendix?.airlines?.find((a: any) => a.fs === mainFlight.carrierFsCode);
        
        console.log('Main flight details:', {
          carrier: mainFlight.carrierFsCode,
          flightNumber: mainFlight.flightNumber,
          airlineName: mainAirline?.name,
          departure: mainFlight.departureAirportFsCode,
          arrival: mainFlight.arrivalAirportFsCode
        });

        // Process the main flight with its connections
        const processedFlight = {
          carrierFsCode: mainFlight.carrierFsCode,
          flightNumber: mainFlight.flightNumber,
          departureTime: mainFlight.departureTime,
          arrivalTime: mainFlight.arrivalTime,
          arrivalCountry: legs[legs.length - 1].arrivalAirportFsCode === destination 
            ? data.appendix?.airports?.find((a: any) => a.fs === destination)?.countryCode 
            : undefined,
          airlineName: mainAirline?.name,
          departureAirport: mainFlight.departureAirportFsCode,
          arrivalAirport: mainFlight.arrivalAirportFsCode,
          connections: legs.slice(1).map((leg: any) => {
            const connectionAirline = data.appendix?.airlines?.find((a: any) => a.fs === leg.carrierFsCode);
            console.log('Connection leg details:', {
              carrier: leg.carrierFsCode,
              flightNumber: leg.flightNumber,
              airlineName: connectionAirline?.name,
              departure: leg.departureAirportFsCode,
              arrival: leg.arrivalAirportFsCode
            });
            
            return {
              carrierFsCode: leg.carrierFsCode,
              flightNumber: leg.flightNumber,
              departureTime: leg.departureTime,
              arrivalTime: leg.arrivalTime,
              airlineName: connectionAirline?.name,
              departureAirport: leg.departureAirportFsCode,
              arrivalAirport: leg.arrivalAirportFsCode,
              isConnection: true
            };
          })
        };

        console.log('Processed flight with connections:', processedFlight);
        return processedFlight;
      }).filter(Boolean);

      console.log('Final processed flights:', JSON.stringify(flights));
      data.scheduledFlights = flights;
    } else {
      console.log('No connections data found in response');
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
    console.error('Detailed error in flight schedule search:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
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