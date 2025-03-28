import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Amadeus API configuration
const AMADEUS_API_BASE_URL = 'https://api.amadeus.com';
const AMADEUS_AUTH_URL = `${AMADEUS_API_BASE_URL}/v1/security/oauth2/token`;
const AMADEUS_FLIGHT_SEARCH_URL = `${AMADEUS_API_BASE_URL}/v2/shopping/flight-offers`;

// Cache for Amadeus access token
let amadeusToken = null;
let amadeusTokenExpiry = 0;

// Function to authenticate with Amadeus API
async function getAmadeusToken() {
  console.log('Getting Amadeus authentication token');
  
  // Check if we have a valid cached token
  const now = Date.now();
  if (amadeusToken && amadeusTokenExpiry > now) {
    console.log('Using cached Amadeus token');
    return amadeusToken;
  }
  
  // Fetch a new token
  try {
    const apiKey = Deno.env.get('AMADEUS_API_KEY');
    const apiSecret = Deno.env.get('AMADEUS_API_SECRET');
    
    if (!apiKey || !apiSecret) {
      throw new Error('Missing Amadeus API credentials');
    }
    
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', apiKey);
    params.append('client_secret', apiSecret);
    
    const response = await fetch(AMADEUS_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Amadeus authentication failed: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    // Cache the token with expiry time (subtract 60 seconds for safety margin)
    amadeusToken = data.access_token;
    amadeusTokenExpiry = now + (data.expires_in - 60) * 1000;
    
    console.log('Successfully acquired Amadeus token');
    
    return amadeusToken;
  } catch (error) {
    console.error('Error authenticating with Amadeus:', error);
    throw error;
  }
}

// Function to search flights using Amadeus API
async function searchAmadeusFlights(origin, destination, date) {
  console.log('Searching flights with Amadeus API:', { origin, destination, date });
  
  try {
    const token = await getAmadeusToken();
    
    // Prepare parameters for Amadeus flight search
    const searchDate = new Date(date);
    const formattedDate = searchDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    // Build the search URL with parameters
    const searchUrl = new URL(AMADEUS_FLIGHT_SEARCH_URL);
    searchUrl.searchParams.append('originLocationCode', origin);
    searchUrl.searchParams.append('destinationLocationCode', destination);
    searchUrl.searchParams.append('departureDate', formattedDate);
    searchUrl.searchParams.append('adults', '1');
    searchUrl.searchParams.append('max', '50');
    searchUrl.searchParams.append('nonStop', 'false');
    
    // Make the API request
    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Amadeus flight search failed: ${response.status} ${errorText}`);
      
      // If we get a 401, our token might be expired despite our safety margin
      if (response.status === 401) {
        // Force token refresh on next call
        amadeusToken = null;
        amadeusTokenExpiry = 0;
      }
      
      throw new Error(`Amadeus flight search failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Amadeus returned ${data.data?.length || 0} flight offers`);
    
    return data;
  } catch (error) {
    console.error('Error searching Amadeus flights:', error);
    throw error;
  }
}

// Function to map Amadeus flight data to our FlightData structure
function mapAmadeusToFlightData(amadeusData) {
  console.log('Mapping Amadeus data to FlightData structure');
  
  try {
    if (!amadeusData.data || amadeusData.data.length === 0) {
      console.log('No flight offers found in Amadeus data');
      return [];
    }
    
    // Dictionary to store airport details
    const airportsDict = {};
    
    // Populate airports dictionary if dictionaries are available
    if (amadeusData.dictionaries && amadeusData.dictionaries.locations) {
      for (const [key, value] of Object.entries(amadeusData.dictionaries.locations)) {
        airportsDict[key] = value;
      }
    }
    
    // Map each flight offer to our FlightData structure
    return amadeusData.data.map((offer, index) => {
      // Extract the first itinerary (outbound journey)
      const itinerary = offer.itineraries[0];
      
      if (!itinerary || !itinerary.segments || itinerary.segments.length === 0) {
        console.log(`Skipping offer ${index} due to missing segments`);
        return null;
      }
      
      // Map each segment of the itinerary
      const segments = itinerary.segments.map(segment => {
        // Extract carrier code and flight number
        const [carrierCode, flightNumber] = segment.carrierCode && segment.number ? 
          [segment.carrierCode, segment.number] : 
          segment.operating ? 
            [segment.operating.carrierCode, segment.operating.number] : 
            [segment.carrierCode || 'Unknown', segment.number || 'Unknown'];
        
        // Calculate elapsed time in minutes
        const departureTime = new Date(segment.departure.at);
        const arrivalTime = new Date(segment.arrival.at);
        const elapsedTimeMinutes = Math.round((arrivalTime.getTime() - departureTime.getTime()) / (1000 * 60));
        
        // Get departure and arrival countries if available in the dictionary
        const departureAirportInfo = airportsDict[segment.departure.iataCode];
        const arrivalAirportInfo = airportsDict[segment.arrival.iataCode];
        
        const departureCountry = departureAirportInfo ? departureAirportInfo.countryName : undefined;
        const arrivalCountry = arrivalAirportInfo ? arrivalAirportInfo.countryName : undefined;
        
        return {
          carrierFsCode: carrierCode,
          flightNumber: flightNumber,
          departureTime: segment.departure.at,
          arrivalTime: segment.arrival.at,
          departureAirportFsCode: segment.departure.iataCode,
          arrivalAirportFsCode: segment.arrival.iataCode,
          departureTerminal: segment.departure.terminal,
          arrivalTerminal: segment.arrival.terminal,
          stops: 0, // Direct segment has no stops
          elapsedTime: elapsedTimeMinutes,
          isCodeshare: segment.carrierCode !== segment.operating?.carrierCode,
          departureCountry,
          arrivalCountry,
        };
      });
      
      // Calculate total journey duration and stops
      const totalDuration = segments.reduce((total, segment) => total + segment.elapsedTime, 0);
      const stops = segments.length - 1;
      
      // Get origin and destination countries from first and last segments
      const firstSegment = segments[0];
      const lastSegment = segments[segments.length - 1];
      
      return {
        segments,
        totalDuration,
        stops,
        origin: {
          country: firstSegment.departureCountry,
          code: firstSegment.departureAirportFsCode
        },
        destination: {
          country: lastSegment.arrivalCountry,
          code: lastSegment.arrivalAirportFsCode
        }
      };
    }).filter(Boolean); // Remove any null entries
  } catch (error) {
    console.error('Error mapping Amadeus data:', error);
    return [];
  }
}

// Function to search flights with Cirium API (keeping the existing implementation)
async function searchCiriumFlights(origin, destination, date, appId, appKey) {
  console.log('Fetching from Cirium APIs...');
  
  const searchDate = new Date(date);
  const year = searchDate.getUTCFullYear();
  const month = searchDate.getUTCMonth() + 1;
  const day = searchDate.getUTCDate();
  
  const schedulesUrl = `https://api.flightstats.com/flex/schedules/rest/v1/json/from/${origin}/to/${destination}/departing/${year}/${month}/${day}?appId=${appId}&appKey=${appKey}`;
  const connectionsUrl = `https://api.flightstats.com/flex/connections/rest/v3/json/firstflightin/${origin}/to/${destination}/arriving_before/${year}/${month}/${day}/14/0?appId=${appId}&appKey=${appKey}&maxResults=10&numHours=6&maxConnections=2`;
  
  const [schedulesResponse, connectionsResponse] = await Promise.all([
    fetch(schedulesUrl),
    fetch(connectionsUrl)
  ]);
  
  if (!schedulesResponse.ok || !connectionsResponse.ok) {
    throw new Error('Failed to fetch flight data from Cirium');
  }
  
  const schedulesData = await schedulesResponse.json();
  const connectionsData = await connectionsResponse.json();
  
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
    }) || [];
  
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
  })) || [];
  
  return [...nonStopFlights, ...connectingFlights];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin, destination, date, api = 'amadeus' } = await req.json();
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
    
    // Log which API we're using for this search
    console.log(`Using API provider: ${api}`);
    
    let connections = [];
    
    // Use the selected API provider
    if (api === 'amadeus') {
      try {
        // Get flights from Amadeus
        const amadeusData = await searchAmadeusFlights(origin, destination, date);
        connections = mapAmadeusToFlightData(amadeusData);
        
        console.log(`Amadeus search returned ${connections.length} connections`);
      } catch (error) {
        console.error('Error with Amadeus search, falling back to Cirium:', error);
        
        // Fall back to Cirium if Amadeus fails
        const appId = Deno.env.get('CIRIUM_APP_ID');
        const appKey = Deno.env.get('CIRIUM_APP_KEY');
        
        if (!appId || !appKey) {
          throw new Error('Missing Cirium API credentials for fallback');
        }
        
        connections = await searchCiriumFlights(origin, destination, date, appId, appKey);
        console.log(`Fallback to Cirium returned ${connections.length} connections`);
      }
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

    return new Response(
      JSON.stringify({ 
        connections,
        api_provider: api
      }),
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
    );
  }
});
