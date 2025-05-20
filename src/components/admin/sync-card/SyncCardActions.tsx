
import { Button } from "@/components/ui/button";
import { Loader2, ArrowUp } from "lucide-react";

interface SyncCardActionsProps {
  isLoading: boolean;
  isSyncInProgress: boolean;
  onSync: (resume?: boolean, mode?: string) => void;
  syncMode: string;
  formattedTitle: string;
}

export const SyncCardActions = ({
  isLoading,
  isSyncInProgress,
  onSync,
  syncMode,
  formattedTitle
}: SyncCardActionsProps) => {
  return (
    <div className="space-y-2">
      {isSyncInProgress && (
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
        disabled={isLoading || isSyncInProgress}
        size="lg"
        variant={isSyncInProgress ? "outline" : "default"}
        className="w-full text-lg relative overflow-hidden group"
      >
        <span className="relative z-10 flex items-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Starting {formattedTitle} Sync...
            </>
          ) : isSyncInProgress ? (
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
  );
};
