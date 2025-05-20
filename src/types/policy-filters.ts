export type PetTypeFilter = 'dog' | 'cat' | 'bird' | 'rabbit' | 'rodent' | 'other';

export interface TravelMethodFilter {
  cabin: boolean;
  cargo: boolean;
}

export interface WeightFilterOptions {
  // We'll keep min for backward compatibility but it's no longer used in the UI
  min?: number;
  max?: number;
  includeCarrier?: boolean;
}

export interface PetPolicyFilterParams {
  petTypes?: PetTypeFilter[];
  travelMethod?: TravelMethodFilter;
  minWeight?: number; // Keep for backward compatibility with existing code
  maxWeight?: number;
  weightIncludesCarrier?: boolean;
  includeBreedRestrictions?: boolean;
}

export interface FilteredPolicyResult {
  airlineId: string;
  airlineCode: string;
  airlineName: string;
  matchReason: string[];
}
