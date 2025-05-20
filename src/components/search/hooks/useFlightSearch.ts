
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FlightData } from "@/components/flight-results/types";
import { ApiProvider } from "@/config/feature-flags";
import { PetPolicyFilterParams } from "@/types/policy-filters";
import { shouldIncludePolicy } from "./utils/policyFilterUtils";

export const useFlightSearch = () => {
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  /**
   * Handles the flight search operation
   * @param origin The departure airport code
   * @param destination The arrival airport code
   * @param date The departure date
   * @param policySearch Optional policy search parameter
   * @param apiProvider Optional API provider to use
   * @param activeFilters Optional policy filters to apply to results
   * @param allowedAirlineCodes Optional list of airline codes to filter results by
   * @returns Promise containing flight data
   */
  const handleFlightSearch = async (
    origin: string,
    destination: string,
    date: Date,
    policySearch: string = "",
    apiProvider?: ApiProvider,
    activeFilters?: PetPolicyFilterParams,
    allowedAirlineCodes?: string[]
  ): Promise<FlightData[]> => {
    setIsSearchLoading(true);

    try {
      console.log(`Searching for flights from ${origin} to ${destination} on ${date}`);
      
      // Format search parameters
      const formattedDate = date.toISOString().split('T')[0];
      
      // Call Supabase edge function with optional provider
      const { data, error } = await supabase.functions.invoke('search_flight_schedules_v2', {
        body: { 
          origin, 
          destination, 
          date: formattedDate,
          provider: apiProvider 
        }
      });
      
      if (error) {
        console.error("Flight search error:", error);
        throw new Error(`Search error: ${error.message || "Failed to fetch flights"}`);
      }
      
      if (!data || !data.flights || data.flights.length === 0) {
        return [];
      }
      
      // Transform the flight data while preserving the segments array
      const transformedFlights = data.flights.map((flight: any) => ({
        id: flight.id,
        origin: flight.origin || origin,
        destination: flight.destination || destination,
        departure_date: flight.departure_date || formattedDate,
        airline_id: flight.airline_id || flight.carrierCode,
        airline_code: flight.airline_code || flight.carrierCode,
        airline_name: flight.airline_name || flight.airlineName,
        flight_number: flight.flight_number || flight.flightNumber || "",
        departure_time: flight.departure_time || flight.departureTime || "",
        arrival_time: flight.arrival_time || flight.arrivalTime || "",
        duration: flight.duration || "",
        stops: flight.stops || 0,
        price: flight.price || 0,
        // Preserve the segments array which is needed by FlightResults component
        segments: flight.segments || [],
        // Preserve totalDuration which might be used for calculations
        totalDuration: flight.totalDuration || 0,
      }));
      
      // Apply airline code filtering if a list of allowed airline codes is provided
      if (allowedAirlineCodes && allowedAirlineCodes.length > 0) {
        console.log(`Filtering ${transformedFlights.length} flights to only include airlines: ${allowedAirlineCodes.join(', ')}`);
        
        const filteredFlights = transformedFlights.filter(flight => {
          // First check the main flight's airline code
          const mainAirlineMatch = allowedAirlineCodes.includes(flight.airline_code);
          if (mainAirlineMatch) return true;
          
          // If no match on main airline, check all segments if they exist
          if (flight.segments && flight.segments.length > 0) {
            // For multi-segment flights, we need to check each segment's carrier
            // The flight is included if ANY segment matches an allowed airline
            return flight.segments.some((segment: any) => {
              const segmentCarrier = segment.carrierFsCode || segment.carrierCode;
              return allowedAirlineCodes.includes(segmentCarrier);
            });
          }
          
          // If we got here, no matches were found
          return false;
        });
        
        console.log(`After airline filtering: ${filteredFlights.length} flights match the criteria`);
        return filteredFlights;
      }

      // If no filters are applied or no airline filtering is requested, return all flights
      if (!activeFilters || Object.keys(activeFilters).length === 0 || !allowedAirlineCodes) {
        return transformedFlights;
      }
      
      // If we get here, we have activeFilters but no allowedAirlineCodes
      // This is the original filtering logic, kept for backward compatibility
      console.log("Filtering flights with active filters:", activeFilters);
      
      // First, get pet policies for each airline in the results
      const airlineCodes = new Set<string>(
        transformedFlights.flatMap(flight => 
          flight.segments?.map(segment => segment.carrierFsCode as string) || []
        )
      );
      
      if (airlineCodes.size === 0) {
        console.log("No airline codes found in flight segments");
        return transformedFlights; // Return all flights if no airline codes found
      }
      
      // Fetch pet policies for the airlines - fix the type casting
      const { data: policiesData, error: policiesError } = await supabase
        .from('pet_policies')
        .select(`
          id, 
          airlines!inner(id, iata_code),
          pet_types_allowed,
          cabin_max_weight_kg,
          cabin_linear_dimensions_cm,
          cargo_max_weight_kg,
          cargo_linear_dimensions_cm,
          breed_restrictions
        `)
        .in('airlines.iata_code', Array.from(airlineCodes) as string[]);
      
      if (policiesError) {
        console.error("Error fetching pet policies:", policiesError);
        return transformedFlights; // Return all flights if there's an error
      }
      
      if (!policiesData || policiesData.length === 0) {
        console.log("No pet policies found");
        return transformedFlights; // Return all flights if no policies found
      }
      
      // Create mapping from airline code to policy
      const policyMap = policiesData.reduce((map: Record<string, any>, policy: any) => {
        if (policy.airlines && policy.airlines.iata_code) {
          map[policy.airlines.iata_code] = policy;
        }
        return map;
      }, {});
      
      // Filter flights based on whether their airlines match the filter criteria
      return transformedFlights.filter(flight => {
        // Check if all segments match the filter criteria
        // For multiple segments, all must match (e.g., all connection flights)
        const allSegmentsMatch = !flight.segments || flight.segments.length === 0 || 
          flight.segments.every(segment => {
            const airlineCode = segment.carrierFsCode;
            const policy = policyMap[airlineCode];
            
            // If there's no policy for this airline, we can't filter it
            if (!policy) return true;
            
            // Check if the policy matches the filter criteria
            return shouldIncludePolicy(policy, activeFilters);
          });
        
        return allSegmentsMatch;
      });
    } catch (error: any) {
      console.error("Error in flight search:", error);
      throw error;
    } finally {
      setIsSearchLoading(false);
    }
  };

  return { isSearchLoading, handleFlightSearch };
};
