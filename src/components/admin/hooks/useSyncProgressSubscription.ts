
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { SyncProgressDB } from "../types/sync-types";
import { SyncProgressRecord } from "@/types/sync";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export const useSyncProgressSubscription = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('Setting up sync progress subscription');
    const channel = supabase
      .channel('sync_progress_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_progress'
        },
        async (payload: RealtimePostgresChangesPayload<SyncProgressDB>) => {
          console.log('Received sync progress update:', payload);
          const newRecord = payload.new as SyncProgressDB;
          
          if (newRecord) {
            console.log(`Processing sync progress update for ${newRecord.type}:`, newRecord);
            
            // Update the query cache with the new progress
            queryClient.setQueryData<SyncProgressRecord>(
              ["syncProgress"],
              (oldData) => ({
                ...(oldData || {}),
                [newRecord.type]: {
                  total: newRecord.total,
                  processed: newRecord.processed,
                  lastProcessed: newRecord.last_processed,
                  processedItems: newRecord.processed_items || [],
                  errorItems: newRecord.error_items || [],
                  startTime: newRecord.start_time,
                  isComplete: newRecord.is_complete
                }
              })
            );

            // If sync failed, show error toast
            if (newRecord.error_items?.length > 0) {
              const lastError = newRecord.error_items[newRecord.error_items.length - 1];
              toast({
                variant: "destructive",
                title: "Sync Error",
                description: `Error during ${newRecord.type} sync: ${lastError}`,
              });
            }

            // If sync completed successfully, show success toast
            if (newRecord.is_complete && payload.eventType === 'UPDATE') {
              toast({
                title: "Sync Complete",
                description: `Successfully synchronized ${newRecord.type} data.`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up sync progress subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

