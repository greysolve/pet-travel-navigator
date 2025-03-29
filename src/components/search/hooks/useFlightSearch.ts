import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth/AuthContext";
import { useProfile } from "@/contexts/profile/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { ApiProvider } from "@/config/feature-flags";
import type { FlightData } from "@/components/flight-results/types";

const useAmadeusFlights = async (
  origin: string,
  destination: string,
  date: string,
  passengers: number
): Promise<FlightData[]> => {
  const params = new URLSearchParams({
    originLocationCode: origin,
    destinationLocationCode: destination,
    departureDate: date,
    adults: String(passengers),
    nonStop: "false",
  });

  const url = `/api/flights/amadeus?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    const errorData = await res.json();
    console.error("Amadeus API Error:", errorData);
    throw new Error(
      errorData.error || "Failed to fetch flights from Amadeus. Check console for details."
    );
  }

  const data = await res.json();
  return data.data || [];
};

const useAeroDataBoxFlights = async (
  origin: string,
  destination: string,
  date: string
): Promise<FlightData[]> => {
  const params = new URLSearchParams({
    dep: origin,
    arr: destination,
    dateFrom: date,
    dateTo: date,
  });

  const url = `/api/flights/aerodatabox?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    const errorData = await res.json();
    console.error("AeroDataBox API Error:", errorData);
    throw new Error(
      errorData.message ||
        "Failed to fetch flights from AeroDataBox. Check console for details."
    );
  }

  const data = await res.json();
  return data.result || [];
};

export const useFlightSearch = () => {
  const [isSearchLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { profile } = useProfile();
  const isPetCaddie = profile?.userRole === 'pet_caddie';

  const { data: searchCountData } = useQuery(
    ["searchCount", user?.id],
    async () => {
      if (!user || !isPetCaddie) return 999;

      const { data, error } = await supabase
        .from("profiles")
        .select("search_count")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching search count:", error);
        return 0;
      }

      return data?.search_count ?? 0;
    },
    {
      enabled: !!user && isPetCaddie,
    }
  );

  const handleFlightSearch = async (
    origin: string,
    destination: string,
    date: Date,
    onResults: (results: FlightData[], policies?: Record<string, any>, apiError?: string) => void,
    onComplete?: () => void,
    apiProvider: ApiProvider = "aerodatabox",
    enableFallback: boolean = false,
    passengers: number = 1
  ): Promise<FlightData[]> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to search",
        variant: "destructive",
      });
      return [];
    }

    if (isPetCaddie && (searchCountData === undefined || searchCountData <= 0)) {
      toast({
        title: "No searches left",
        description: "You have reached your search limit. Please upgrade your plan.",
        variant: "destructive",
      });
      return [];
    }

    setIsSearchLoading(true);
    let flightResults: FlightData[] = [];
    let apiError: string | undefined = undefined;

    const dateString = date.toISOString().split("T")[0];

    try {
      if (apiProvider === "amadeus" || enableFallback) {
        try {
          flightResults = await useAmadeusFlights(origin, destination, dateString, passengers);
          onResults(flightResults, undefined, "amadeus");
        } catch (amadeusError: any) {
          apiError = amadeusError.message;
          console.error("Amadeus Search Failed:", amadeusError);

          if (apiProvider === "amadeus" && enableFallback) {
            toast({
              title: "Amadeus Search Failed",
              description:
                "Falling back to AeroDataBox due to an error with Amadeus. " + apiError,
              variant: "warning",
            });
          } else if (apiProvider === "amadeus") {
            toast({
              title: "Amadeus Search Failed",
              description: apiError,
              variant: "destructive",
            });
            onResults([], undefined, "amadeus", apiError);
            return [];
          }
        }
      }

      if (
        (apiProvider === "aerodatabox" && flightResults.length === 0) ||
        enableFallback
      ) {
        try {
          flightResults = await useAeroDataBoxFlights(origin, destination, dateString);
          onResults(flightResults, undefined, "aerodatabox");
        } catch (aeroError: any) {
          apiError = aeroError.message;
          console.error("AeroDataBox Search Failed:", aeroError);

          if (apiProvider === "aerodatabox") {
            toast({
              title: "AeroDataBox Search Failed",
              description: apiError,
              variant: "destructive",
            });
            onResults([], undefined, "aerodatabox", apiError);
            return [];
          }
        }
      }
    } finally {
      setIsSearchLoading(false);
      if (onComplete) onComplete();
    }

    if (isPetCaddie && searchCountData !== undefined && flightResults.length > 0) {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ search_count: Math.max(0, searchCountData - 1) })
          .eq("id", user.id);

        if (error) {
          console.error("Error updating search count:", error);
        }
      } catch (error) {
        console.error("Error updating search count:", error);
      }
    }

    return flightResults;
  };

  return {
    isSearchLoading,
    searchCount: searchCountData,
    isPetCaddie,
    handleFlightSearch,
  };
};
