import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

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

  const isSyncInProgress = () => {
    return syncProgress && !syncProgress.isComplete;
  };

  const progressPercentage = syncProgress 
    ? ((syncProgress.processed / syncProgress.total) * 100).toFixed(1) 
    : 0;

  return (
    <div className="p-8 border rounded-lg bg-card shadow-sm transition-all duration-200 hover:shadow-md">
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        {title}
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      </h2>
      
      <div className="flex items-center space-x-3 mb-6">
        <Checkbox 
          id={`clear${title.replace(/\s+/g, '')}`}
          checked={clearData}
          onCheckedChange={(checked) => onClearDataChange(checked === true)}
          disabled={isLoading || isSyncInProgress()}
        />
        <Label 
          htmlFor={`clear${title.replace(/\s+/g, '')}`} 
          className={`text-lg ${(isLoading || isSyncInProgress()) ? 'opacity-50' : ''}`}
        >
          Clear existing {title.toLowerCase()} data first
        </Label>
      </div>

      {syncProgress?.total > 0 && !syncProgress.isComplete ? (
        <div className="mb-6 space-y-4 animate-fade-in">
          <div className="space-y-2">
            <Progress 
              value={Number(progressPercentage)}
              className="h-2"
            />
            <p className="text-sm text-muted-foreground text-right">{progressPercentage}%</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <p>Progress: {syncProgress.processed} of {syncProgress.total}</p>
              <p>Elapsed time: {elapsedTime}</p>
            </div>
            <div>
              <p>Est. remaining: {estimatedTimeRemaining}</p>
              {syncProgress.lastProcessed && (
                <p className="truncate">Last: {syncProgress.lastProcessed}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                Processed
                <span className="text-xs bg-secondary/20 px-2 py-0.5 rounded-full">
                  {syncProgress.processedItems.length}
                </span>
              </h3>
              <ScrollArea className="h-32 rounded border p-2">
                <div className="space-y-1">
                  {syncProgress.processedItems.map((item, i) => (
                    <div key={i} className="text-sm py-1 px-2 rounded hover:bg-accent/50 transition-colors">
                      {item}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                Errors
                {syncProgress.errorItems.length > 0 && (
                  <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
                    {syncProgress.errorItems.length}
                  </span>
                )}
              </h3>
              <ScrollArea className="h-32 rounded border border-destructive/20 p-2">
                <div className="space-y-1">
                  {syncProgress.errorItems.map((item, i) => (
                    <div key={i} className="text-sm text-destructive py-1 px-2 rounded hover:bg-destructive/10 transition-colors">
                      {item}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-4 mb-6">
          <Skeleton className="h-2 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {isSyncInProgress() && (
          <Button 
            onClick={() => onSync(true)}
            disabled={isLoading}
            size="lg"
            className="w-full text-lg relative overflow-hidden group"
          >
            <span className="relative z-10">
              {isLoading ? "Resuming Sync..." : "Resume Sync"}
            </span>
            <div className="absolute inset-0 bg-primary/10 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
          </Button>
        )}
        <Button 
          onClick={() => onSync()}
          disabled={isLoading || isSyncInProgress()}
          size="lg"
          variant={isSyncInProgress() ? "outline" : "default"}
          className="w-full text-lg relative overflow-hidden group"
        >
          <span className="relative z-10">
            {isLoading ? `Syncing ${title}...` : 
             isSyncInProgress() ? "Sync in Progress..." : "Start New Sync"}
          </span>
          <div className="absolute inset-0 bg-primary/10 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
        </Button>
      </div>
    </div>
  );
};