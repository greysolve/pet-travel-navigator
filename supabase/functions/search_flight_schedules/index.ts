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
    const hour = 14
    const minute = 0

    console.log('Parsed search date components:', { year, month, day, hour, minute });

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

    // Transform the flight schedules data into our expected format
    if (data.connections?.scheduledFlights) {
      console.log('Processing scheduled flights. Total flights:', data.connections.scheduledFlights.length);
      
      // Get all unique airport codes from the flights
      const airportCodes = new Set<string>();
      data.connections.scheduledFlights.forEach((flight: any) => {
        if (flight.departureAirportFsCode) airportCodes.add(flight.departureAirportFsCode);
        if (flight.arrivalAirportFsCode) airportCodes.add(flight.arrivalAirportFsCode);
      });

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

      // Process each flight and create journey segments
      const processedFlights = data.connections.scheduledFlights.map((flight: any) => {
        const airline = data.appendix?.airlines?.find((a: any) => a.fs === flight.carrierFsCode);
        const departureAirport = airportMap.get(flight.departureAirportFsCode);
        const arrivalAirport = airportMap.get(flight.arrivalAirportFsCode);

        console.log('Processing flight:', {
          carrier: flight.carrierFsCode,
          flightNumber: flight.flightNumber,
          airlineName: airline?.name,
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

      // Create journeys with the correct structure
      const journeys = processedFlights.map(flight => ({
        segments: [flight],
        totalDuration: flight.elapsedTime,
        stops: flight.stops,
        arrivalCountry: flight.arrivalCountry
      }));

      // Return the response with the correct structure maintaining the connections parent
      return new Response(
        JSON.stringify({ 
          connections: {
            scheduledFlights: journeys
          }
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // If no flights found, return empty array with correct structure
    return new Response(
      JSON.stringify({ 
        connections: {
          scheduledFlights: []
        }
      }),
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