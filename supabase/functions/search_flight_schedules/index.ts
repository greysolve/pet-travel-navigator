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

    const url = `https://api.flightstats.com/flex/schedules/rest/v2/json/from/${origin}/to/${destination}/departing/${year}/${month}/${day}?appId=${appId}&appKey=${appKey}`

    console.log('Fetching from Cirium API with URL:', url);
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('Cirium API error:', response.status, response.statusText);
      console.error('Error response:', await response.text());
      throw new Error(`Cirium API error: ${response.statusText}`);
    }
    
    const data = await response.json()
    console.log('Raw Cirium API response:', JSON.stringify(data));

    // Initialize Supabase client to fetch airport data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get all unique airport codes from the connections
    const airportCodes = new Set<string>();
    data.scheduledFlights?.connections?.forEach((connection: any) => {
      connection.flights?.forEach((flight: any) => {
        if (flight.departureAirportFsCode) airportCodes.add(flight.departureAirportFsCode);
        if (flight.arrivalAirportFsCode) airportCodes.add(flight.arrivalAirportFsCode);
      });
    });

    console.log('Found airport codes:', Array.from(airportCodes));

    // Fetch airport data for all airports in one query
    const { data: airports, error: airportsError } = await supabase
      .from('airports')
      .select('iata_code, country')
      .in('iata_code', Array.from(airportCodes));

    if (airportsError) {
      console.error('Error fetching airport data:', airportsError);
      throw new Error('Failed to fetch airport data');
    }

    // Create a map for quick airport lookups
    const airportMap = new Map(
      airports?.map(airport => [airport.iata_code, airport]) || []
    );

    // Process each connection and its flights
    const journeys = data.scheduledFlights?.connections?.map((connection: any) => {
      console.log('Processing connection:', connection);

      const segments = connection.flights?.map((flight: any) => {
        const departureAirport = airportMap.get(flight.departureAirportFsCode);
        const arrivalAirport = airportMap.get(flight.arrivalAirportFsCode);

        console.log('Processing flight:', {
          carrier: flight.carrierFsCode,
          flightNumber: flight.flightNumber,
          departure: flight.departureAirportFsCode,
          arrival: flight.arrivalAirportFsCode,
          departureCountry: departureAirport?.country,
          arrivalCountry: arrivalAirport?.country
        });

        return {
          carrierFsCode: flight.carrierFsCode,
          flightNumber: flight.flightNumber,
          departureTime: flight.departureTime,
          arrivalTime: flight.arrivalTime,
          departureAirportFsCode: flight.departureAirportFsCode,
          arrivalAirportFsCode: flight.arrivalAirportFsCode,
          departureTerminal: flight.departureTerminal,
          arrivalTerminal: flight.arrivalTerminal,
          departureCountry: departureAirport?.country,
          arrivalCountry: arrivalAirport?.country,
          elapsedTime: flight.flightDurationMinutes,
          stops: flight.stops || 0,
          isCodeshare: flight.isCodeshare || false,
          codeshares: flight.codeshares
        };
      });

      const totalDuration = segments?.reduce((total: number, segment: any) => 
        total + (segment.elapsedTime || 0), 0);

      return {
        segments,
        totalDuration,
        stops: segments ? segments.length - 1 : 0,
        arrivalCountry: segments?.[segments.length - 1]?.arrivalCountry
      };
    }) || [];

    console.log('Processed journeys:', journeys);

    // Return the response with the correct structure
    return new Response(
      JSON.stringify({ scheduledFlights: journeys }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );

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