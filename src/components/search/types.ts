
import { User } from "@supabase/supabase-js";
import { FlightData, PetPolicy } from "../flight-results/types";
import { ApiProvider } from "@/config/feature-flags";

export interface SearchSectionProps {
  onSearchResults: (flights: FlightData[], policies?: Record<string, PetPolicy>, provider?: string, apiError?: string) => void;
}

export interface SavedSearch {
  id: string;
  search_criteria: {
    origin?: string;
    destination?: string;
    date?: string;
    policySearch?: string;
  };
  created_at: string;
}

export interface FormContainerProps {
  user: User | null;
  isPetCaddie: boolean;
  searchCount: number | undefined;
  savedSearches: SavedSearch[];
  isLoading: boolean;
  policySearch: string;
  setPolicySearch: (value: string) => void;
  hasRouteSearch: boolean;
  clearRouteSearch: () => void;
  origin: string;
  destination: string;
  setOrigin: (value: string) => void;
  setDestination: (value: string) => void;
  date: Date | undefined;
  setDate: (value: Date | undefined) => void;
  clearPolicySearch: () => void;
  shouldSaveSearch: boolean;
  setShouldSaveSearch: (value: boolean) => void;
  toast: any;
  onSearchResults: (flights: FlightData[], policies?: Record<string, PetPolicy>, provider?: string, apiError?: string) => void;
  setFlights: (flights: FlightData[]) => void;
  onLoadSearch: (searchCriteria: any) => void;
  handleDeleteSearch: (id: string) => Promise<void>;
  handleSearch: () => Promise<void>;
  onPolicySearch: () => Promise<void>;
  apiProvider?: ApiProvider;
  enableFallback?: boolean;
}

// Add missing type definitions for components
export interface SearchFormHeaderProps {
  user: User | null;
  isPetCaddie: boolean;
  searchCount: number | undefined;
  savedSearches: SavedSearch[];
  onLoadSearch: (searchCriteria: any) => void;
  onDeleteSearch: (e: any, id: string) => void;
  isLoading: boolean;
}

export interface AirlinePolicySearchProps {
  policySearch: string;
  setPolicySearch: (value: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  onFocus?: () => void;
}

export interface Airport {
  iata_code: string;
  name: string;
  city: string;
  country: string;
  search_score?: number;
}

export interface RouteSearchProps {
  origin: string;
  destination: string;
  setOrigin: (value: string) => void;
  setDestination: (value: string) => void;
  date: Date | undefined;
  setDate?: (value: Date | undefined) => void;
  clearPolicySearch?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  onFocus?: () => void;
}
