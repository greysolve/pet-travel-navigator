
import { CheckCircle2, Loader2, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTitle } from "./utils";
import type { SyncProgress } from "./types";

interface SyncCardHeaderProps {
  title: string;
  isLoading: boolean;
  syncProgress?: SyncProgress;
}

export const SyncCardHeader = ({ title, isLoading, syncProgress }: SyncCardHeaderProps) => {
  const formattedTitle = formatTitle(title);
  
  const isSyncInProgress = () => 
    syncProgress && 
    (!syncProgress.isComplete || syncProgress.needsContinuation);
  
  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
    if (syncProgress?.isComplete && !syncProgress?.needsContinuation) 
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (isSyncInProgress()) return <ArrowUp className="w-5 h-5 text-blue-500 animate-bounce" />;
    return null;
  };

  return (
    <h2 className="text-2xl font-semibold mb-6 flex items-center justify-between">
      <span>{formattedTitle}</span>
      {getStatusIcon()}
    </h2>
  );
};
