
export type PetTypeFilter = 'dog' | 'cat' | 'bird' | 'rabbit' | 'rodent' | 'other';

export interface TravelMethodFilter {
  cabin: boolean;
  cargo: boolean;
}

export interface WeightFilterOptions {
  min?: number;
  max?: number;
  includeCarrier?: boolean;
}

export interface PetPolicyFilterParams {
  petTypes?: PetTypeFilter[];
  travelMethod?: TravelMethodFilter;
  minWeight?: number;
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
