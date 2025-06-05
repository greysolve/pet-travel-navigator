
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
   * @returns Promise containing flight data
   */
  const handleFlightSearch = async (
    origin: string,
    destination: string,
    date: Date,
    policySearch: string = "",
    apiProvider?: ApiProvider,
    activeFilters?: PetPolicyFilterParams
  ): Promise<FlightData[]> => {
    setIsSearchLoading(true);

    try {
      console.log(`Searching for flights from ${origin} to ${destination} on ${date}`);
      console.log("Active filters:", activeFilters);
      
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
        console.log("No flights found");
        return [];
      }
      
      console.log(`Found ${data.flights.length} flights before filtering`);
      
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

      // Apply client-side filtering if activeFilters are provided
      if (!activeFilters || Object.keys(activeFilters).length === 0) {
        console.log("No active filters, returning all flights");
        return transformedFlights;
      }
      
      console.log("Applying client-side filtering with active filters:", activeFilters);
      
      // Extract all unique airline codes from flight segments
      const airlineCodes = new Set<string>();
      
      transformedFlights.forEach(flight => {
        // Add the main airline code
        if (flight.airline_code) {
          airlineCodes.add(flight.airline_code);
        }
        
        // Add codes from segments (for connections)
        if (flight.segments && Array.isArray(flight.segments)) {
          flight.segments.forEach(segment => {
            if (segment.carrierFsCode) {
              airlineCodes.add(segment.carrierFsCode);
            }
          });
        }
      });
      
      console.log("Airline codes found in flights:", Array.from(airlineCodes));
      
      if (airlineCodes.size === 0) {
        console.log("No airline codes found in flight data");
        return transformedFlights; // Return all flights if no airline codes found
      }
      
      // Fetch pet policies for the airlines
      console.log("Fetching pet policies for airlines:", Array.from(airlineCodes));
      
      const { data: policiesData, error: policiesError } = await supabase
        .from('pet_policies')
        .select(`
          id, 
          airlines!inner(id, iata_code),
          pet_types_allowed,
          cabin_max_weight_kg,
          cabin_combined_weight_kg,
          cabin_linear_dimensions_cm,
          cargo_max_weight_kg,
          cargo_combined_weight_kg,
          cargo_linear_dimensions_cm,
          breed_restrictions,
          weight_includes_carrier
        `)
        .in('airlines.iata_code', Array.from(airlineCodes));
      
      if (policiesError) {
        console.error("Error fetching pet policies:", policiesError);
        return transformedFlights; // Return all flights if there's an error
      }
      
      console.log(`Found ${policiesData?.length || 0} pet policies`);
      
      if (!policiesData || policiesData.length === 0) {
        console.log("No pet policies found for any airlines");
        return transformedFlights; // Return all flights if no policies found
      }
      
      // Create mapping from airline code to policy
      const policyMap = policiesData.reduce((map: Record<string, any>, policy: any) => {
        if (policy.airlines && policy.airlines.iata_code) {
          map[policy.airlines.iata_code] = policy;
          console.log(`Policy found for airline ${policy.airlines.iata_code}:`, {
            cabin_max_weight: policy.cabin_max_weight_kg,
            cargo_max_weight: policy.cargo_max_weight_kg,
            pet_types: policy.pet_types_allowed
          });
        }
        return map;
      }, {});
      
      console.log("Policy map created with airlines:", Object.keys(policyMap));
      
      // Filter flights based on whether their airlines match the filter criteria
      const filteredFlights = transformedFlights.filter(flight => {
        // For flights with segments, ALL segments must match the criteria
        if (flight.segments && Array.isArray(flight.segments) && flight.segments.length > 0) {
          const allSegmentsMatch = flight.segments.every(segment => {
            const airlineCode = segment.carrierFsCode;
            const policy = policyMap[airlineCode];
            
            console.log(`Checking segment with airline ${airlineCode}:`, {
              hasPolicy: !!policy,
              policyDetails: policy ? {
                cabin_max_weight: policy.cabin_max_weight_kg,
                cargo_max_weight: policy.cargo_max_weight_kg
              } : null
            });
            
            // If there's no policy for this airline, exclude it when filters are active
            if (!policy) {
              console.log(`❌ No policy found for airline ${airlineCode}, excluding flight`);
              return false;
            }
            
            // Check if the policy matches the filter criteria
            const matches = shouldIncludePolicy(policy, activeFilters);
            console.log(`${matches ? '✅' : '❌'} Policy for ${airlineCode} ${matches ? 'matches' : 'does not match'} filters`);
            return matches;
          });
          
          return allSegmentsMatch;
        } else {
          // For flights without segments, check the main airline
          const airlineCode = flight.airline_code;
          const policy = policyMap[airlineCode];
          
          console.log(`Checking flight with main airline ${airlineCode}:`, {
            hasPolicy: !!policy,
            policyDetails: policy ? {
              cabin_max_weight: policy.cabin_max_weight_kg,
              cargo_max_weight: policy.cargo_max_weight_kg
            } : null
          });
          
          // If there's no policy for this airline, exclude it when filters are active
          if (!policy) {
            console.log(`❌ No policy found for main airline ${airlineCode}, excluding flight`);
            return false;
          }
          
          // Check if the policy matches the filter criteria
          const matches = shouldIncludePolicy(policy, activeFilters);
          console.log(`${matches ? '✅' : '❌'} Policy for ${airlineCode} ${matches ? 'matches' : 'does not match'} filters`);
          return matches;
        }
      });
      
      console.log(`Filtering complete: ${filteredFlights.length} flights remain out of ${transformedFlights.length} original flights`);
      
      return filteredFlights;
    } catch (error: any) {
      console.error("Error in flight search:", error);
      throw error;
    } finally {
      setIsSearchLoading(false);
    }
  };

  return { isSearchLoading, handleFlightSearch };
};
