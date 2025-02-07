
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SyncCard } from "./SyncCard";
import { SyncType } from "@/types/sync";
import { ActiveSyncs } from "./sync/ActiveSyncs";
import { useSyncOperations } from "./hooks/useSyncOperations";
import { useSyncProgressSubscription } from "./hooks/useSyncProgressSubscription";
import { SyncProgressDB } from "./types/sync-types";
import { useToast } from "@/hooks/use-toast";

export const SyncSection = () => {
  const { toast } = useToast();
  const { isInitializing, clearData, setClearData, handleSync } = useSyncOperations();
  
  // Set up sync progress subscription
  useSyncProgressSubscription();

  const { data: syncProgress } = useQuery({
    queryKey: ["syncProgress"],
    queryFn: async () => {
      console.log('Fetching initial sync progress...');
      const { data, error } = await supabase
        .from('sync_progress')
        .select('*');

      if (error) {
        console.error('Error fetching sync progress:', error);
        throw error;
      }

      console.log('Raw sync progress data:', data);

      const progressRecord = (data as SyncProgressDB[]).reduce((acc, curr) => {
        acc[curr.type as keyof typeof SyncType] = {
          total: curr.total,
          processed: curr.processed,
          lastProcessed: curr.last_processed,
          processedItems: curr.processed_items || [],
          errorItems: curr.error_items || [],
          startTime: curr.start_time,
          isComplete: curr.is_complete,
          needsContinuation: curr.needs_continuation
        };
        return acc;
      }, {} as any);

      console.log('Processed sync progress data:', progressRecord);
      return progressRecord;
    },
  });

  return (
    <div className="space-y-8">
      <ActiveSyncs syncProgress={syncProgress || {}} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {Object.entries(SyncType).map(([key, value]) => (
          <SyncCard
            key={key}
            title={`${key.replace(/([A-Z])/g, ' $1').trim()} Synchronization`}
            clearData={clearData[key as keyof typeof SyncType]}
            onClearDataChange={(checked) => {
              setClearData(prev => ({ ...prev, [key]: checked }));
            }}
            isLoading={isInitializing[value]}
            onSync={(resume, mode) => handleSync(key as keyof typeof SyncType, resume, mode)}
            syncProgress={syncProgress?.[value]}
          />
        ))}
      </div>
    </div>
  );
};

export default SyncSection;
