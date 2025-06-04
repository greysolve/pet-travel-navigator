
import { PetPolicyFilterParams } from "@/types/policy-filters";
import type { FlightData, PetPolicy } from "../flight-results/types";
import type { ToastFunction } from "@/hooks/use-toast";
import { ApiProvider } from "@/config/feature-flags";

export interface SavedSearch {
  id: string;
  name: string | null;
  search_criteria: SavedSearchCriteria;
  created_at: string;
  updated_at?: string;
  user_id?: string;
}

export interface SavedSearchCriteria {
  origin: string;
  destination: string;
  date?: string;
  policySearch: string;
  passengers?: number;
  search_type?: 'route' | 'policy';
  // Advanced filter parameters
  activeFilters?: {
    petTypes?: string[];
    travelMethod?: {
      cabin: boolean;
      cargo: boolean;
    };
    minWeight?: number;
    maxWeight?: number;
    weightIncludesCarrier?: boolean;
    includeBreedRestrictions?: boolean;
  };
}

export interface SearchSectionProps {
  onSearchResults: (flights: FlightData[], policies?: Record<string, PetPolicy>, provider?: string, apiError?: string) => void;
}

export interface FormContainerProps {
  user: any;
  isPetCaddie: boolean;
  searchCount: number;
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
  date?: Date;
  setDate: (value?: Date) => void;
  clearPolicySearch: () => void;
  shouldSaveSearch: boolean;
  setShouldSaveSearch: (value: boolean) => void;
  passengers: number;
  setPassengers: (value: number) => void;
  toast: ToastFunction;
  onSearchResults: (flights: FlightData[], policies?: Record<string, PetPolicy>, provider?: string, apiError?: string) => void;
  setFlights: (flights: FlightData[]) => void;
  onLoadSearch: (searchCriteria: SavedSearchCriteria) => void;
  handleDeleteSearch: (searchId: string) => void;
  handleSearch: () => Promise<void>;
  onPolicySearch: () => Promise<void>;
  apiProvider?: ApiProvider;
  enableFallback?: boolean;
  activeFilters?: PetPolicyFilterParams;
  onApplyFilters: (filters: PetPolicyFilterParams) => void;
}

export interface SearchFormHeaderProps {
  user: any;
  isPetCaddie: boolean;
  searchCount: number;
  savedSearches: SavedSearch[];
  passengers: number;
  setPassengers: (value: number) => void;
  onLoadSearch: (searchCriteria: SavedSearchCriteria) => void;
  onDeleteSearch: (e: React.MouseEvent, searchId: string) => void;
  isLoading: boolean;
  activeFilters?: PetPolicyFilterParams;
  onApplyFilters: (filters: PetPolicyFilterParams) => void;
}
