
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { FlightData } from "../../flight-results/types";

export const useFlightSearchState = (userId: string | undefined) => {
  const [policySearch, setPolicySearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState<Date>();
  const [flights, setFlights] = useState<FlightData[]>([]);
  const [shouldSaveSearch, setShouldSaveSearch] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const { toast } = useToast();

  const clearRouteSearch = () => {
    setOrigin("");
    setDestination("");
    setDate(undefined);
  };

  const clearPolicySearch = () => {
    setPolicySearch("");
  };

  useEffect(() => {
    console.log('Auth state changed, resetting form state');
    setPolicySearch("");
    setOrigin("");
    setDestination("");
    setDate(undefined);
    setFlights([]);
    setShouldSaveSearch(false);
    setPassengers(1);
  }, [userId]);

  return {
    policySearch,
    setPolicySearch,
    origin,
    setOrigin,
    destination,
    setDestination,
    date,
    setDate,
    flights,
    setFlights,
    shouldSaveSearch,
    setShouldSaveSearch,
    passengers,
    setPassengers,
    clearRouteSearch,
    clearPolicySearch,
    toast
  };
};
