
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SyncCardHeader } from "./SyncCardHeader";
import { SyncCardOptions } from "./SyncCardOptions";
import { SyncProgressDisplay } from "./SyncProgressDisplay";
import { SyncCardActions } from "./SyncCardActions";
import { formatTitle } from "./utils";
import type { SyncCardProps } from "./types";

export const SyncCard = ({
  title,
  clearData,
  onClearDataChange,
  isLoading,
  onSync,
  syncProgress,
  forceContentComparison = false,
  onForceContentComparisonChange,
  showForceContentComparison = false,
}: SyncCardProps) => {
  const [syncMode, setSyncMode] = useState('clear');
  const formattedTitle = formatTitle(title);

  const isSyncInProgress = () => 
    syncProgress && 
    (!syncProgress.isComplete || syncProgress.needsContinuation);

  return (
    <div className={cn(
      "p-8 border rounded-lg bg-card shadow-sm transition-all duration-200 hover:shadow-md",
      isSyncInProgress() && "border-blue-500/50",
      syncProgress?.isComplete && !syncProgress?.needsContinuation && "border-green-500/50"
    )}>
      <SyncCardHeader 
        title={title} 
        isLoading={isLoading} 
        syncProgress={syncProgress} 
      />
      
      <SyncCardOptions 
        title={title}
        clearData={clearData}
        onClearDataChange={onClearDataChange}
        isLoading={isLoading}
        isSyncInProgress={isSyncInProgress()}
        forceContentComparison={forceContentComparison}
        onForceContentComparisonChange={onForceContentComparisonChange}
        showForceContentComparison={showForceContentComparison}
      />

      {syncProgress?.total > 0 && !syncProgress.isComplete || syncProgress?.needsContinuation ? (
        <SyncProgressDisplay syncProgress={syncProgress} />
      ) : null}

      <SyncCardActions 
        isLoading={isLoading}
        isSyncInProgress={isSyncInProgress()}
        onSync={onSync}
        syncMode={syncMode}
        formattedTitle={formattedTitle}
      />
    </div>
  );
};
