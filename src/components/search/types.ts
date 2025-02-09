
import type { FlightData, PetPolicy } from "../flight-results/types";

export interface SearchSectionProps {
  onSearchResults: (
    flights: FlightData[], 
    petPolicies?: Record<string, PetPolicy>
  ) => void;
}

export type SavedSearch = {
  id: string;
  name: string | null;
  search_criteria: {
    origin: string;
    destination: string;
    date?: string;
  };
  created_at: string;
}
