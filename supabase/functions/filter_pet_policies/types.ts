
export interface TravelMethodFilter {
  cabin: boolean;
  cargo: boolean;
}

export interface PetPolicyFilterParams {
  petTypes?: string[];
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
