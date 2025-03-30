
// Function to search flights with Cirium API
export async function searchCiriumFlights(origin: string, destination: string, date: string, appId: string, appKey: string) {
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
  
  // Check for HTTP errors
  if (!schedulesResponse.ok || !connectionsResponse.ok) {
    throw new Error(`Failed to fetch flight data from Cirium: Schedules ${schedulesResponse.status}, Connections ${connectionsResponse.status}`);
  }
  
  const schedulesData = await schedulesResponse.json();
  const connectionsData = await connectionsResponse.json();
  
  // Validate the response data
  if (!schedulesData.scheduledFlights || !Array.isArray(schedulesData.scheduledFlights) || 
      !connectionsData.connections || !Array.isArray(connectionsData.connections)) {
    throw new Error('Invalid response data from Cirium API: Missing expected data structure');
  }
  
  // Check if we have any flights at all
  if (schedulesData.scheduledFlights.length === 0 && connectionsData.connections.length === 0) {
    throw new Error('No flights found in Cirium API response');
  }
  
  // Process non-stop flights
  const nonStopFlights = schedulesData.scheduledFlights
    ?.filter((flight: any) => !flight.isCodeshare)
    ?.map((flight: any) => {
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
          departureCountry: schedulesData.appendix.airports.find((a: any) => a.fs === flight.departureAirportFsCode)?.countryName,
          arrivalCountry: schedulesData.appendix.airports.find((a: any) => a.fs === flight.arrivalAirportFsCode)?.countryName,
        }],
        totalDuration: elapsedTimeMinutes,
        stops: 0,
        origin: {
          country: schedulesData.appendix.airports.find((a: any) => a.fs === flight.departureAirportFsCode)?.countryName,
          code: flight.departureAirportFsCode
        },
        destination: {
          country: schedulesData.appendix.airports.find((a: any) => a.fs === flight.arrivalAirportFsCode)?.countryName,
          code: flight.arrivalAirportFsCode
        }
      };
    }) || [];
  
  // Process connecting flights
  const connectingFlights = connectionsData.connections?.map((connection: any) => ({
    segments: connection.scheduledFlight.map((flight: any) => ({
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
      departureCountry: connectionsData.appendix.airports.find((a: any) => a.fs === flight.departureAirportFsCode)?.countryName,
      arrivalCountry: connectionsData.appendix.airports.find((a: any) => a.fs === flight.arrivalAirportFsCode)?.countryName,
    })),
    totalDuration: connection.elapsedTime,
    stops: connection.scheduledFlight.length - 1,
    origin: {
      country: connectionsData.appendix.airports.find((a: any) => a.fs === connection.scheduledFlight[0].departureAirportFsCode)?.countryName,
      code: connection.scheduledFlight[0].departureAirportFsCode
    },
    destination: {
      country: connectionsData.appendix.airports.find((a: any) => a.fs === connection.scheduledFlight[connection.scheduledFlight.length - 1].arrivalAirportFsCode)?.countryName,
      code: connection.scheduledFlight[connection.scheduledFlight.length - 1].arrivalAirportFsCode
    }
  })) || [];
  
  const allFlights = [...nonStopFlights, ...connectingFlights];
  
  // Ensure we actually have processed flights
  if (allFlights.length === 0) {
    throw new Error('Failed to process any valid flights from Cirium API response');
  }
  
  console.log(`Cirium search returned ${allFlights.length} connections`);
  return allFlights;
}
