
// Amadeus API configuration
const AMADEUS_API_BASE_URL = 'https://api.amadeus.com';
const AMADEUS_AUTH_URL = `${AMADEUS_API_BASE_URL}/v1/security/oauth2/token`;
const AMADEUS_FLIGHT_SEARCH_URL = `${AMADEUS_API_BASE_URL}/v2/shopping/flight-offers`;

// Cache for Amadeus access token
let amadeusToken: string | null = null;
let amadeusTokenExpiry = 0;

// Function to authenticate with Amadeus API
export async function getAmadeusToken() {
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
export async function searchAmadeusFlights(origin: string, destination: string, date: string) {
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
    
    // Validate that we have actual flight data
    if (!data.data || data.data.length === 0) {
      throw new Error('Amadeus returned no flight data');
    }
    
    return data;
  } catch (error) {
    console.error('Error searching Amadeus flights:', error);
    throw error;
  }
}

// Function to map Amadeus flight data to our FlightData structure
export function mapAmadeusToFlightData(amadeusData: any) {
  console.log('Mapping Amadeus data to FlightData structure');
  
  try {
    if (!amadeusData.data || amadeusData.data.length === 0) {
      console.log('No flight offers found in Amadeus data');
      return [];
    }
    
    // Dictionary to store airport details
    const airportsDict: Record<string, any> = {};
    
    // Populate airports dictionary if dictionaries are available
    if (amadeusData.dictionaries && amadeusData.dictionaries.locations) {
      for (const [key, value] of Object.entries(amadeusData.dictionaries.locations)) {
        airportsDict[key] = value;
      }
    }
    
    // Map each flight offer to our FlightData structure
    return amadeusData.data.map((offer: any, index: number) => {
      // Extract the first itinerary (outbound journey)
      const itinerary = offer.itineraries[0];
      
      if (!itinerary || !itinerary.segments || itinerary.segments.length === 0) {
        console.log(`Skipping offer ${index} due to missing segments`);
        return null;
      }
      
      // Map each segment of the itinerary
      const segments = itinerary.segments.map((segment: any) => {
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
