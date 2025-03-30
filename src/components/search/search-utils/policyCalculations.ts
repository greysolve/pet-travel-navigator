
import { supabase } from "@/integrations/supabase/client";
import type { FlightData } from "../../flight-results/types";

/**
 * Get country codes from the airports database based on IATA codes
 * @param iataCodeArray Array of unique IATA airport codes
 * @returns Array of unique country codes
 */
export const getCountryCodesFromAirports = async (iataCodeArray: string[]): Promise<string[]> => {
  if (!iataCodeArray.length) return [];
  
  console.log("Looking up countries for airports:", iataCodeArray);
  
  const { data, error } = await supabase
    .from('airports')
    .select('country, iata_code')
    .in('iata_code', iataCodeArray);
  
  if (error) {
    console.error("Error fetching country data from airports:", error);
    return [];
  }
  
  if (!data || !data.length) {
    console.warn("No country data found for airports:", iataCodeArray);
    return [];
  }
  
  // Extract unique country codes
  const countryCodes = Array.from(new Set(
    data
      .filter(airport => airport.country)
      .map(airport => airport.country)
  ));
  
  console.log("Found country codes:", countryCodes);
  return countryCodes;
};

/**
 * Gets unique countries from flight segments by looking up IATA codes in the airports table
 * This ensures consistent country codes regardless of API provider
 */
export const getSearchCountries = async (flights: FlightData[]): Promise<string[]> => {
  // Extract all unique airport IATA codes
  const airportCodes = Array.from(flights.reduce((airports: Set<string>, journey) => {
    journey.segments?.forEach(segment => {
      if (segment.departureAirportFsCode) airports.add(segment.departureAirportFsCode);
      if (segment.arrivalAirportFsCode) airports.add(segment.arrivalAirportFsCode);
    });
    return airports;
  }, new Set<string>()));
  
  // Look up country codes from the airports table
  return await getCountryCodesFromAirports(airportCodes);
};
