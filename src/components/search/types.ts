import type { FlightData, PetPolicy } from "../flight-results/types";

export interface SearchSectionProps {
  onSearchResults: (
    flights: FlightData[], 
    petPolicies?: Record<string, PetPolicy>
  ) => void;
}