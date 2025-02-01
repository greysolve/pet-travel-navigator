export type SyncType = 'airlines' | 'airports' | 'petPolicies' | 'routes' | 'countryPolicies';

export interface SyncProgress {
  total: number;
  processed: number;
  lastProcessed: string | null;
  processedItems: string[];
  errorItems: string[];
  startTime: string | null;
  isComplete: boolean;
}

export interface SyncProgressRecord {
  [key: string]: SyncProgress;
}