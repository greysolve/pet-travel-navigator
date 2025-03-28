
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSingleAirlinePolicy } from "@/components/flight-results/PolicyFetcher";
import { ApiProvider } from "@/config/feature-flags";
import type { FlightData, PetPolicy } from "@/components/flight-results/types";

interface UseSearchHandlerProps {
  user: any;
  toast: any;
  policySearch: string;
  origin: string;
  destination: string;
  date?: Date;
  shouldSaveSearch: boolean;
  setFlights: (flights: FlightData[]) => void;
  handleFlightSearch: (
    origin: string,
    destination: string,
    date: Date,
    onResults: (results: FlightData[], policies?: Record<string, any>) => void,
    onComplete?: () => void,
    apiProvider?: ApiProvider
  ) => Promise<FlightData[]>;
  onSearchResults: (flights: FlightData[], policies?: Record<string, PetPolicy>, provider?: string) => void;
  apiProvider?: ApiProvider;
}

export const useSearchHandler = ({
  user,
  toast,
  policySearch,
  origin,
  destination,
  date,
  shouldSaveSearch,
  setFlights,
  handleFlightSearch,
  onSearchResults,
  apiProvider,
}: UseSearchHandlerProps) => {
  // Use the policy fetcher hook for airline policy searches
  const { data: airlinePolicy, refetch: refetchPolicy } = useSingleAirlinePolicy(policySearch);
  
  const handlePolicySearch = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search",
        variant: "destructive",
      });
      return;
    }

    try {
      // Refetch the policy
      await refetchPolicy();

      if (airlinePolicy) {
        setFlights([]);
        onSearchResults([], { [policySearch]: airlinePolicy });

        // Save search if needed
        if (shouldSaveSearch) {
          saveSearch({
            policySearch,
          });
        }
      } else {
        toast({
          title: "No policy found",
          description: `We couldn't find a pet policy for ${policySearch}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error searching for policy:", error);
      toast({
        title: "Search error",
        description: "There was a problem searching for this airline policy",
        variant: "destructive",
      });
    }
  };

  const handleRouteSearch = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Date required",
        description: "Please select a travel date",
        variant: "destructive",
      });
      return;
    }

    try {
      await handleFlightSearch(
        origin,
        destination,
        date,
        (flights, policies) => {
          // Pass along the API provider in the response
          onSearchResults(flights, policies, apiProvider);
        },
        undefined,
        apiProvider
      );

      // Save search criteria if needed
      if (shouldSaveSearch) {
        saveSearch({
          origin,
          destination,
          date: date.toISOString(),
        });
      }
    } catch (error) {
      console.error("Error in route search:", error);
      toast({
        title: "Search error",
        description: "There was a problem searching for flights",
        variant: "destructive",
      });
    }
  };

  // Helper function to save a search
  const saveSearch = async (searchCriteria: any) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("saved_searches").insert({
        user_id: user.id,
        search_criteria: searchCriteria,
      });

      if (error) {
        if (error.message.includes("saved searches")) {
          toast({
            title: "Limit reached",
            description: "You've reached the maximum number of saved searches",
            variant: "destructive",
          });
        } else {
          console.error("Error saving search:", error);
          toast({
            title: "Failed to save",
            description: "There was a problem saving your search",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error saving search:", error);
    }
  };

  return {
    handlePolicySearch,
    handleRouteSearch,
  };
};
