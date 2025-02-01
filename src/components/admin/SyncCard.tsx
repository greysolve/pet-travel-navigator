import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { SyncProgress } from "@/types/sync";

interface SyncCardProps {
  title: string;
  clearData: boolean;
  onClearDataChange: (checked: boolean) => void;
  isLoading: boolean;
  onSync: (resume?: boolean) => void;
  syncProgress?: SyncProgress;
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

    if (syncProgress?.start_time && !syncProgress.is_complete) {
      intervalId = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(syncProgress.start_time!).getTime()) / 1000);
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
  }, [syncProgress?.start_time, syncProgress?.processed, syncProgress?.total, syncProgress?.is_complete]);

  const isSyncInProgress = () => {
    return syncProgress && !syncProgress.is_complete;
  };

  const progressPercentage = syncProgress 
    ? ((syncProgress.processed / syncProgress.total) * 100).toFixed(1) 
    : 0;

  // Ensure arrays have default values
  const processedItems = syncProgress?.processed_items || [];
  const errorItems = syncProgress?.error_items || [];

  return (
    <div className="p-8 border rounded-lg bg-card shadow-sm transition-all duration-200 hover:shadow-md">
      <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        {title}
        {isLoading && (
          <div className="animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
        {syncProgress?.is_complete && !isLoading && (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        )}
      </h2>
      
      <div className="flex items-center space-x-3 mb-6">
        <Checkbox 
          id={`clear${title.replace(/\s+/g, '')}`}
          checked={clearData}
          onCheckedChange={(checked) => onClearDataChange(checked === true)}
          disabled={isLoading || isSyncInProgress()}
          className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        />
        <Label 
          htmlFor={`clear${title.replace(/\s+/g, '')}`} 
          className={`text-lg ${(isLoading || isSyncInProgress()) ? 'opacity-50' : ''}`}
        >
          Clear existing {title.toLowerCase()} data first
        </Label>
      </div>

      {syncProgress?.total > 0 && !syncProgress.is_complete ? (
        <div className="mb-6 space-y-4 animate-fade-in">
          <div className="space-y-2">
            <Progress 
              value={Number(progressPercentage)}
              className="h-2 transition-all"
            />
            <p className="text-sm text-muted-foreground text-right">{progressPercentage}%</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <p className="flex items-center gap-1">
                <span className="font-medium">Progress:</span> 
                {syncProgress.processed} of {syncProgress.total}
              </p>
              <p className="flex items-center gap-1">
                <span className="font-medium">Elapsed:</span> 
                {elapsedTime}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1">
                <span className="font-medium">Remaining:</span> 
                {estimatedTimeRemaining}
              </p>
              {syncProgress.last_processed && (
                <p className="truncate">
                  <span className="font-medium">Last:</span> {syncProgress.last_processed}
                </p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                Processed
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
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
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
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item}</span>
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
            className="w-full text-lg relative overflow-hidden group bg-primary hover:bg-primary/90"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resuming Sync...
                </>
              ) : (
                "Resume Sync"
              )}
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
          <span className="relative z-10 flex items-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing {title}...
              </>
            ) : isSyncInProgress() ? (
              "Sync in Progress..."
            ) : (
              "Start New Sync"
            )}
          </span>
          <div className="absolute inset-0 bg-primary/10 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
        </Button>
      </div>
    </div>
  );
};
