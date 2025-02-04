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

    // Transform the connections data into our expected format
    if (data.connections) {
      console.log('Processing connections data. Total connections:', data.connections.length);
      
      // Each connection represents a complete journey
      const journeys = data.connections.map((connection: any) => {
        const segments = connection.scheduledFlight;
        console.log('Processing journey with segments:', segments?.length || 0);

        if (!segments || segments.length === 0) {
          console.log('No segments found for this journey, skipping');
          return null;
        }

        // Get the final destination from the last segment
        const finalSegment = segments[segments.length - 1];
        const arrivalCountry = data.appendix?.airports?.find(
          (a: any) => a.fs === finalSegment.arrivalAirportFsCode
        )?.countryCode;

        // Process all segments in the journey
        const processedSegments = segments.map((segment: any) => {
          const airline = data.appendix?.airlines?.find((a: any) => a.fs === segment.carrierFsCode);
          console.log('Processing segment:', {
            carrier: segment.carrierFsCode,
            flightNumber: segment.flightNumber,
            airlineName: airline?.name,
            departure: segment.departureAirportFsCode,
            arrival: segment.arrivalAirportFsCode
          });

          return {
            carrierFsCode: segment.carrierFsCode,
            flightNumber: segment.flightNumber,
            departureTime: segment.departureTime,
            arrivalTime: segment.arrivalTime,
            airlineName: airline?.name,
            departureAirport: segment.departureAirportFsCode,
            arrivalAirport: segment.arrivalAirportFsCode,
            departureTerminal: segment.departureTerminal,
            arrivalTerminal: segment.arrivalTerminal,
          };
        });

        // Return the complete journey with all its segments
        return {
          segments: processedSegments,
          arrivalCountry,
          totalDuration: segments.reduce((total: number, seg: any) => total + (seg.elapsedTime || 0), 0),
          stops: segments.length - 1
        };
      }).filter(Boolean);

      console.log('Final processed journeys:', JSON.stringify(journeys));
      data.scheduledFlights = journeys;
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