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

    const searchDate = new Date(date)
    const year = searchDate.getUTCFullYear()
    const month = searchDate.getUTCMonth() + 1
    const day = searchDate.getUTCDate()

    console.log('Parsed search date components:', { year, month, day });

    // Fetch non-stop flights from Schedules API
    const schedulesUrl = `https://api.flightstats.com/flex/schedules/rest/v1/json/from/${origin}/to/${destination}/departing/${year}/${month}/${day}?appId=${appId}&appKey=${appKey}`
    
    // Fetch connecting flights from Connections API
    const connectionsUrl = `https://api.flightstats.com/flex/connections/rest/v3/json/firstflightin/${origin}/to/${destination}/arriving_before/${year}/${month}/${day}/14/0?appId=${appId}&appKey=${appKey}&maxResults=10&numHours=6&maxConnections=2`

    console.log('Fetching from Cirium APIs...');
    
    const [schedulesResponse, connectionsResponse] = await Promise.all([
      fetch(schedulesUrl),
      fetch(connectionsUrl)
    ]);

    if (!schedulesResponse.ok) {
      console.error('Schedules API error:', schedulesResponse.status, schedulesResponse.statusText);
      console.error('Error response:', await schedulesResponse.text());
      throw new Error(`Schedules API error: ${schedulesResponse.statusText}`);
    }

    if (!connectionsResponse.ok) {
      console.error('Connections API error:', connectionsResponse.status, connectionsResponse.statusText);
      console.error('Error response:', await connectionsResponse.text());
      throw new Error(`Connections API error: ${connectionsResponse.statusText}`);
    }

    const schedulesData = await schedulesResponse.json();
    const connectionsData = await connectionsResponse.json();

    console.log('Processing Schedules API response:', schedulesData);
    console.log('Processing Connections API response:', connectionsData);

    // Filter out codeshare flights from schedules
    const nonStopFlights = schedulesData.scheduledFlights
      ?.filter(flight => !flight.isCodeshare)
      ?.map(flight => ({
        segments: [{
          carrierFsCode: flight.carrierFsCode,
          flightNumber: flight.flightNumber,
          departureTime: flight.departureTime,
          arrivalTime: flight.arrivalTime,
          departureAirportFsCode: flight.departureAirportFsCode,
          arrivalAirportFsCode: flight.arrivalAirportFsCode,
          departureTerminal: flight.departureTerminal,
          arrivalTerminal: flight.arrivalTerminal,
          stops: flight.stops,
          elapsedTime: 0, // Not provided in schedules API
          isCodeshare: flight.isCodeshare,
          codeshares: flight.codeshares,
          departureCountry: schedulesData.appendix.airports.find(a => a.fs === flight.departureAirportFsCode)?.countryName,
          arrivalCountry: schedulesData.appendix.airports.find(a => a.fs === flight.arrivalAirportFsCode)?.countryName,
        }],
        totalDuration: 0, // Not provided in schedules API
        stops: 0
      })) || [];

    // Process connecting flights
    const connectingFlights = connectionsData.connections?.map(connection => ({
      segments: connection.scheduledFlight.map(flight => ({
        carrierFsCode: flight.carrierFsCode,
        flightNumber: flight.flightNumber,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        departureAirportFsCode: flight.departureAirportFsCode,
        arrivalAirportFsCode: flight.arrivalAirportFsCode,
        departureTerminal: flight.departureTerminal,
        arrivalTerminal: flight.arrivalTerminal,
        stops: flight.stops || 0,
        elapsedTime: flight.elapsedTime || 0,
        isCodeshare: flight.isCodeshare || false,
        codeshares: flight.codeshares || [],
        departureCountry: connectionsData.appendix.airports.find(a => a.fs === flight.departureAirportFsCode)?.countryName,
        arrivalCountry: connectionsData.appendix.airports.find(a => a.fs === flight.arrivalAirportFsCode)?.countryName,
      })),
      totalDuration: connection.elapsedTime,
      stops: connection.scheduledFlight.length - 1
    })) || [];

    // Combine both types of flights
    const allFlights = [...nonStopFlights, ...connectingFlights];

    console.log(`Found ${nonStopFlights.length} non-stop and ${connectingFlights.length} connecting flights`);

    return new Response(
      JSON.stringify({ connections: allFlights }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );

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