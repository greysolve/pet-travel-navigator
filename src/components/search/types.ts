
import type { FlightData, PetPolicy } from "../flight-results/types";

export type { PetPolicy };  // Now properly exporting PetPolicy

export interface SearchSectionProps {
  onSearchResults: (
    flights: FlightData[], 
    petPolicies?: Record<string, PetPolicy>
  ) => void;
}

export interface SearchFormHeaderProps {
  user: any;
  isPetCaddie: boolean;
  searchCount: number | undefined;
  savedSearches: SavedSearch[];
  onLoadSearch: (searchCriteria: SavedSearch['search_criteria']) => void;
  onDeleteSearch: (e: React.MouseEvent, searchId: string) => void;
  isLoading?: boolean;  // Added isLoading prop
}

export interface AirlinePolicySearchProps {
  policySearch: string;
  setPolicySearch: (value: string) => void;
  isLoading?: boolean;  // Added isLoading prop
}

export interface RouteSearchProps {
  origin: string;
  destination: string;
  setOrigin: (value: string) => void;
  setDestination: (value: string) => void;
  isLoading?: boolean;  // Added isLoading prop
}

export type SavedSearch = {
  id: string;
  name: string | null;
  search_criteria: {
    origin?: string;
    destination?: string;
    date?: string;
    policySearch?: string;
  };
  created_at: string;
}
