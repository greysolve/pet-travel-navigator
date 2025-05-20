
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useState, useEffect } from "react";
import type { SyncProgress } from "./types";

interface SyncProgressDisplayProps {
  syncProgress: SyncProgress;
}

export const SyncProgressDisplay = ({ syncProgress }: SyncProgressDisplayProps) => {
  const [elapsedTime, setElapsedTime] = useState('');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState('Calculating...');

  useEffect(() => {
    let intervalId: number;

    if (syncProgress?.startTime && !syncProgress.isComplete) {
      intervalId = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(syncProgress.startTime!).getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        setElapsedTime(`${minutes}m ${seconds}s`);

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
  
  const progressPercentage = syncProgress ? ((syncProgress.processed / syncProgress.total) * 100).toFixed(1) : 0;
  const processedItems = syncProgress?.processedItems || [];
  const errorItems = syncProgress?.errorItems || [];

  return (
    <div className="mb-6 space-y-4">
      <div className="space-y-2">
        <Progress 
          value={Number(progressPercentage)}
          className="h-2 transition-all"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{syncProgress.processed} of {syncProgress.total} items processed</span>
          <span>{progressPercentage}%</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
        <div>
          <p className="flex items-center gap-1">
            <span className="font-medium">Time Elapsed:</span> 
            {elapsedTime}
          </p>
          <p className="flex items-center gap-1">
            <span className="font-medium">Est. Remaining:</span> 
            {estimatedTimeRemaining}
          </p>
        </div>
        {syncProgress.lastProcessed && (
          <div>
            <p className="truncate">
              <span className="font-medium">Last Processed:</span>
              <br />
              {syncProgress.lastProcessed}
            </p>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            Processed Items
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {processedItems.length}
            </span>
          </h3>
          <ScrollArea className="h-32 rounded border p-2">
            <div className="space-y-1">
              {processedItems.map((item, i) => (
                <div 
                  key={i} 
                  className="text-sm py-1 px-2 rounded hover:bg-accent/50 transition-colors flex items-center gap-2"
                >
                  <ArrowUp className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            Errors
            {errorItems.length > 0 && (
              <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                {errorItems.length}
              </span>
            )}
          </h3>
          <ScrollArea className="h-32 rounded border border-destructive/20 p-2">
            <div className="space-y-1">
              {errorItems.map((item, i) => (
                <div 
                  key={i} 
                  className="text-sm text-destructive py-1 px-2 rounded hover:bg-destructive/10 transition-colors flex items-center gap-2"
                >
                  <ArrowDown className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
