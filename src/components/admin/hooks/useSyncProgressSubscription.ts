
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SyncProgressDB } from "../types/sync-types";
import { SyncProgressRecord, SyncType } from "@/types/sync";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useSyncOperations } from "./useSyncOperations";

export const useSyncProgressSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { handleSync } = useSyncOperations();

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
                  isComplete: newRecord.is_complete,
                  needsContinuation: newRecord.needs_continuation
                }
              })
            );

            // If sync failed with errors, log them but don't show any toasts
            if (newRecord.error_items?.length > 0) {
              const lastError = newRecord.error_items[newRecord.error_items.length - 1];
              console.error(`Error during ${newRecord.type} sync: ${lastError}`);
              // Removed error toast notification
            }

            // If sync completed successfully, show success toast
            if (newRecord.is_complete && !newRecord.needs_continuation && payload.eventType === 'UPDATE') {
              toast({
                title: "Sync Complete",
                description: `Successfully synchronized ${newRecord.type} data.`,
              });
            }
            
            // Auto-continue syncs when needed - no more timeouts or unnecessary delays
            if (newRecord.needs_continuation && !newRecord.is_complete) {
              console.log(`Auto-continuing sync for ${newRecord.type} from next offset ${newRecord.processed || 0}`);
              
              // Get the next offset for pagination - use the processed count as next offset
              const nextOffset = newRecord.processed;
              
              // Determine if this is a pet policies sync (which needs special handling)
              const isPetPoliciesSync = newRecord.type === SyncType.petPolicies;
              
              // For pet policies, we need to pass flags for content comparison if it was set previously
              const options = isPetPoliciesSync ? {
                forceContentComparison: false,
                compareContent: true,  // Always enable content comparison
                offset: nextOffset     // Use the processed count as the next offset
              } : { offset: nextOffset };
              
              // Continue the sync with the updated offset
              handleSync(newRecord.type as keyof typeof SyncType, true, 'update', options);
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up sync progress subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast, handleSync]);
};
