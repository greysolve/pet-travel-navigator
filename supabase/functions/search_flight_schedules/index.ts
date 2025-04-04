
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
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Check if user is authorized
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .single()

    console.log('User role:', userRole)

    // Fetch flight data
    const searchDate = new Date(date)
    const year = searchDate.getUTCFullYear()
    const month = searchDate.getUTCMonth() + 1
    const day = searchDate.getUTCDate()

    const appId = Deno.env.get('CIRIUM_APP_ID')
    const appKey = Deno.env.get('CIRIUM_APP_KEY')

    if (!appId || !appKey) {
      throw new Error('Missing Cirium API credentials')
    }

    const schedulesUrl = `https://api.flightstats.com/flex/schedules/rest/v1/json/from/${origin}/to/${destination}/departing/${year}/${month}/${day}?appId=${appId}&appKey=${appKey}`
    const connectionsUrl = `https://api.flightstats.com/flex/connections/rest/v3/json/firstflightin/${origin}/to/${destination}/arriving_before/${year}/${month}/${day}/14/0?appId=${appId}&appKey=${appKey}&maxResults=10&numHours=6&maxConnections=2`

    console.log('Fetching from Cirium APIs...')
    
    const [schedulesResponse, connectionsResponse] = await Promise.all([
      fetch(schedulesUrl),
      fetch(connectionsUrl)
    ])

    if (!schedulesResponse.ok || !connectionsResponse.ok) {
      throw new Error('Failed to fetch flight data')
    }

    const schedulesData = await schedulesResponse.json()
    const connectionsData = await connectionsResponse.json()

    // Process non-stop flights
    const nonStopFlights = schedulesData.scheduledFlights
      ?.filter(flight => !flight.isCodeshare)
      ?.map(flight => {
        // Calculate the elapsed time in minutes for non-stop flights
        const departureTime = new Date(flight.departureTime);
        const arrivalTime = new Date(flight.arrivalTime);
        const elapsedTimeMinutes = Math.round((arrivalTime.getTime() - departureTime.getTime()) / (1000 * 60));
        
        return {
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
            elapsedTime: elapsedTimeMinutes,
            isCodeshare: flight.isCodeshare,
            codeshares: flight.codeshares,
            departureCountry: schedulesData.appendix.airports.find(a => a.fs === flight.departureAirportFsCode)?.countryName,
            arrivalCountry: schedulesData.appendix.airports.find(a => a.fs === flight.arrivalAirportFsCode)?.countryName,
          }],
          totalDuration: elapsedTimeMinutes,
          stops: 0,
          origin: {
            country: schedulesData.appendix.airports.find(a => a.fs === flight.departureAirportFsCode)?.countryName,
            code: flight.departureAirportFsCode
          },
          destination: {
            country: schedulesData.appendix.airports.find(a => a.fs === flight.arrivalAirportFsCode)?.countryName,
            code: flight.arrivalAirportFsCode
          }
        };
      }) || []

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
      stops: connection.scheduledFlight.length - 1,
      origin: {
        country: connectionsData.appendix.airports.find(a => a.fs === connection.scheduledFlight[0].departureAirportFsCode)?.countryName,
        code: connection.scheduledFlight[0].departureAirportFsCode
      },
      destination: {
        country: connectionsData.appendix.airports.find(a => a.fs === connection.scheduledFlight[connection.scheduledFlight.length - 1].arrivalAirportFsCode)?.countryName,
        code: connection.scheduledFlight[connection.scheduledFlight.length - 1].arrivalAirportFsCode
      }
    })) || []

    const allFlights = [...nonStopFlights, ...connectingFlights]

    return new Response(
      JSON.stringify({ 
        connections: allFlights,
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )

  } catch (error) {
    console.error('Error in flight schedule search:', error)
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
