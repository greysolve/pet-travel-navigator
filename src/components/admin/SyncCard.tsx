import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SyncCardProps {
  title: string;
  clearData: boolean;
  onClearDataChange: (checked: boolean) => void;
  isLoading: boolean;
  onSync: (resume?: boolean) => void;
  syncProgress?: {
    total: number;
    processed: number;
    lastProcessed: string | null;
    processedItems: string[];
    errorItems: string[];
    startTime: string | null;
    isComplete: boolean;
  };
}

export const SyncCard = ({
  title,
  clearData,
  onClearDataChange,
  isLoading,
  onSync,
  syncProgress,
}: SyncCardProps) => {
  const [elapsedTime, setElapsedTime] = useState('');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState('Calculating...');

  useEffect(() => {
    let intervalId: number;

    if (syncProgress?.startTime && !syncProgress.isComplete) {
      // Update elapsed time every second
      intervalId = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(syncProgress.startTime!).getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        setElapsedTime(`${minutes}m ${seconds}s`);

        // Calculate estimated time remaining
        if (syncProgress.processed > 0) {
          const ratePerItem = elapsed / syncProgress.processed;
          const remaining = (syncProgress.total - syncProgress.processed) * ratePerItem;
          const remainingMinutes = Math.floor(remaining / 60);
          const remainingSeconds = Math.floor(remaining % 60);
          setEstimatedTimeRemaining(`~${remainingMinutes}m ${remainingSeconds}s`);
        }
      }, 1000);
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [syncProgress?.startTime, syncProgress?.processed, syncProgress?.total, syncProgress?.isComplete]);

  const isSyncInProgress = () => {
    return syncProgress && !syncProgress.isComplete;
  };

  return (
    <div className="p-8 border rounded-lg bg-card shadow-sm">
      <h2 className="text-2xl font-semibold mb-6">{title}</h2>
      <div className="flex items-center space-x-3 mb-6">
        <Checkbox 
          id={`clear${title.replace(/\s+/g, '')}`}
          checked={clearData}
          onCheckedChange={(checked) => onClearDataChange(checked === true)}
        />
        <Label htmlFor={`clear${title.replace(/\s+/g, '')}`} className="text-lg">
          Clear existing {title.toLowerCase()} data first
        </Label>
      </div>

      {syncProgress?.total > 0 && !syncProgress.isComplete && (
        <div className="mb-6 space-y-4">
          <Progress 
            value={(syncProgress.processed / syncProgress.total) * 100} 
            className="mb-2"
          />
          <div className="text-sm space-y-2">
            <p>Progress: {syncProgress.processed} of {syncProgress.total} items ({((syncProgress.processed / syncProgress.total) * 100).toFixed(1)}%)</p>
            <p>Elapsed time: {elapsedTime}</p>
            <p>Estimated time remaining: {estimatedTimeRemaining}</p>
            {syncProgress.lastProcessed && (
              <p>Last processed: {syncProgress.lastProcessed}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Processed Items ({syncProgress.processedItems.length})</h3>
              <ScrollArea className="h-32 rounded border p-2">
                <div className="space-y-1">
                  {syncProgress.processedItems.map((item, i) => (
                    <div key={i} className="text-sm">{item}</div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {syncProgress.errorItems.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-destructive">Errors ({syncProgress.errorItems.length})</h3>
                <ScrollArea className="h-32 rounded border border-destructive/20 p-2">
                  <div className="space-y-1">
                    {syncProgress.errorItems.map((item, i) => (
                      <div key={i} className="text-sm text-destructive">{item}</div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {isSyncInProgress() && (
          <Button 
            onClick={() => onSync(true)}
            disabled={isLoading}
            size="lg"
            className="w-full text-lg"
          >
            {isLoading ? "Resuming Sync..." : "Resume Sync"}
          </Button>
        )}
        <Button 
          onClick={() => onSync()}
          disabled={isLoading || isSyncInProgress()}
          size="lg"
          variant={isSyncInProgress() ? "outline" : "default"}
          className="w-full text-lg"
        >
          {isLoading ? `Syncing ${title}...` : 
           isSyncInProgress() ? "Sync in Progress..." : "Start New Sync"}
        </Button>
      </div>
    </div>
  );
};