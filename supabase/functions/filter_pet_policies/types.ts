
export interface TravelMethodFilter {
  cabin: boolean;
  cargo: boolean;
}

export interface PetPolicyFilterParams {
  petTypes?: string[];
  travelMethod?: TravelMethodFilter;
  minWeight?: number;
  maxWeight?: number;
  weightIncludesCarrier?: boolean; // We keep this in the type but ignore it in the filter logic
  includeBreedRestrictions?: boolean;
}

export interface FilteredPolicyResult {
  airlineId: string;
  airlineCode: string;
  airlineName: string;
  matchReason: string[];
}
