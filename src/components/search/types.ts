
export interface SavedSearch {
  id: string;
  name: string | null;
  search_criteria: SavedSearchCriteria;
  created_at: string;
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
