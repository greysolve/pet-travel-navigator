
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, ArrowUp, ArrowDown } from "lucide-react";
import { SyncProgress } from "@/types/sync";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface SyncCardProps {
  title: string;
  clearData: boolean;
  onClearDataChange: (checked: boolean) => void;
  isLoading: boolean;
  onSync: (resume?: boolean, mode?: string) => void;
  syncProgress?: SyncProgress;
}

const formatTitle = (title: string) => {
  const words = title.split(/(?=[A-Z])|[\s_-]+/);
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(' Synchronization', '');
};

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
  const [syncMode, setSyncMode] = useState('clear');

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

  const isSyncInProgress = () => syncProgress && !syncProgress.isComplete;
  const progressPercentage = syncProgress ? ((syncProgress.processed / syncProgress.total) * 100).toFixed(1) : 0;
  const processedItems = syncProgress?.processedItems || [];
  const errorItems = syncProgress?.errorItems || [];
  const formattedTitle = formatTitle(title);

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
    if (syncProgress?.isComplete) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (isSyncInProgress()) return <ArrowUp className="w-5 h-5 text-blue-500 animate-bounce" />;
    return null;
  };

  // Show sync mode selection for pet policies instead of airlines
  const showSyncModeSelection = title.toLowerCase().includes('pet polic');

  return (
    <div className={cn(
      "p-8 border rounded-lg bg-card shadow-sm transition-all duration-200 hover:shadow-md",
      isSyncInProgress() && "border-blue-500/50",
      syncProgress?.isComplete && "border-green-500/50"
    )}>
      <h2 className="text-2xl font-semibold mb-6 flex items-center justify-between">
        <span>{formattedTitle}</span>
        {getStatusIcon()}
      </h2>
      
      {showSyncModeSelection ? (
        <div className="mb-6">
          <RadioGroup
            value={syncMode}
            onValueChange={setSyncMode}
            className="space-y-3"
            disabled={isLoading || isSyncInProgress()}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="clear" id="clear" />
              <Label htmlFor="clear">Clear and Full Sync</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="update" id="update" />
              <Label htmlFor="update">Update Missing Policies Only</Label>
            </div>
          </RadioGroup>
        </div>
      ) : (
        <div className="flex items-center space-x-3 mb-6">
          <Checkbox 
            id={`clear${title.replace(/\s+/g, '')}`}
            checked={clearData}
            onCheckedChange={(checked) => onClearDataChange(checked === true)}
            disabled={isLoading || isSyncInProgress()}
          />
          <Label 
            htmlFor={`clear${title.replace(/\s+/g, '')}`} 
            className={cn("text-lg", (isLoading || isSyncInProgress()) && "opacity-50")}
          >
            Clear existing {formattedTitle.toLowerCase()} data first
          </Label>
        </div>
      )}

      {syncProgress?.total > 0 && !syncProgress.isComplete ? (
        <div className="mb-6 space-y-4">
          <div className="space-y-2">
            <Progress 
              value={Number(progressPercentage)}
              className="h-2 transition-all"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{syncProgress.processed} of {syncProgress.total} items</span>
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
      ) : null}

      <div className="space-y-2">
        {isSyncInProgress() && (
          <Button 
            onClick={() => onSync(true, syncMode)}
            disabled={isLoading}
            size="lg"
            className="w-full text-lg relative overflow-hidden group bg-primary hover:bg-primary/90"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resuming...
                </>
              ) : (
                <>
                  <ArrowUp className="w-4 h-4" />
                  Resume Sync
                </>
              )}
            </span>
          </Button>
        )}
        
        <Button 
          onClick={() => onSync(false, syncMode)}
          disabled={isLoading || isSyncInProgress()}
          size="lg"
          variant={isSyncInProgress() ? "outline" : "default"}
          className="w-full text-lg relative overflow-hidden group"
        >
          <span className="relative z-10 flex items-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting {formattedTitle} Sync...
              </>
            ) : isSyncInProgress() ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sync in Progress...
              </>
            ) : (
              <>
                <ArrowUp className="w-4 h-4" />
                Start New Sync
              </>
            )}
          </span>
        </Button>
      </div>
    </div>
  );
};

