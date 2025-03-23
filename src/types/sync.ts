
export const SyncType = {
  airlines: 'airlines',
  airports: 'airports',
  petPolicies: 'petPolicies',
  routes: 'routes',
  countryPolicies: 'countryPolicies'
} as const;

export type SyncType = typeof SyncType[keyof typeof SyncType];

export interface SyncProgress {
  total: number;
  processed: number;
  lastProcessed: string | null;
  processedItems: string[];
  errorItems: string[];
  startTime: string | null;
  isComplete: boolean;
  needsContinuation: boolean; // Add this flag
  errorDetails?: { [key: string]: string };
}

export interface SyncProgressRecord {
  [key: string]: SyncProgress;
}
