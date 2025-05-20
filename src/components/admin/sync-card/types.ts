
export interface SyncCardProps {
  title: string;
  clearData: boolean;
  onClearDataChange: (checked: boolean) => void;
  isLoading: boolean;
  onSync: (resume?: boolean, mode?: string) => void;
  syncProgress?: SyncProgress;
  forceContentComparison?: boolean;
  onForceContentComparisonChange?: (checked: boolean) => void;
  showForceContentComparison?: boolean;
}

export interface SyncProgress {
  total: number;
  processed: number;
  lastProcessed: string | null;
  processedItems: string[];
  errorItems: string[];
  startTime: string | null;
  isComplete: boolean;
  needsContinuation: boolean;
  errorDetails?: { [key: string]: string };
}
