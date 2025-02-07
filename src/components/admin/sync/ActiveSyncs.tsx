
import { ActiveSyncsProps } from "../types/sync-types";

export const ActiveSyncs = ({ syncProgress }: ActiveSyncsProps) => {
  const hasActiveSyncs = Object.entries(syncProgress || {}).some(
    ([_, progress]) => progress && !progress.isComplete && progress.processed < progress.total
  );

  if (!hasActiveSyncs) return null;

  return (
    <div className="bg-accent/20 p-4 rounded-lg mb-8">
      <h3 className="text-lg font-semibold mb-2">Active Syncs</h3>
      <div className="space-y-2">
        {Object.entries(syncProgress || {}).map(([type, progress]) => 
          progress && !progress.isComplete && progress.processed < progress.total && (
            <div key={type} className="text-sm">
              {type}: {progress.processed} of {progress.total} items processed
            </div>
          )
        )}
      </div>
    </div>
  );
};

