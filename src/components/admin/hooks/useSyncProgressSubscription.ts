
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
    
    // Track active syncs to prevent duplicate continuations
    const activeContinuations: Record<string, boolean> = {};
    
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
            if (newRecord.is_complete && !newRecord.needs_continuation && payload.eventType === 'UPDATE') {
              toast({
                title: "Sync Complete",
                description: `Successfully synchronized ${newRecord.type} data.`,
              });
            }
            
            // Auto-continue syncs when needed
            if (newRecord.needs_continuation && !newRecord.is_complete) {
              // Generate a unique key for this sync continuation
              const continuationKey = `${newRecord.type}_${newRecord.last_processed}`;
              
              // Only trigger a continuation if we haven't already triggered one for this exact state
              if (!activeContinuations[continuationKey]) {
                console.log(`Auto-continuing sync for ${newRecord.type} from ${newRecord.last_processed}`);
                
                // Mark this continuation as active to prevent duplicates
                activeContinuations[continuationKey] = true;
                
                // Small delay to prevent rate limiting and allow UI to update
                setTimeout(() => {
                  // Get the last processed item to use as the next offset
                  let nextOffset = newRecord.processed;
                  
                  // Determine if this is a pet policies sync (which needs special handling)
                  const isPetPoliciesSync = newRecord.type === SyncType.petPolicies;
                  
                  // For pet policies, we need to pass a flag to compare content if it was set previously
                  const options = isPetPoliciesSync ? {
                    forceContentComparison: false,
                    compareContent: true
                  } : undefined;
                  
                  // Continue the sync
                  handleSync(newRecord.type as keyof typeof SyncType, true, 'update', {
                    ...options,
                    offset: nextOffset
                  });
                  
                  // Remove from active continuations after a delay
                  setTimeout(() => {
                    delete activeContinuations[continuationKey];
                  }, 5000); // Wait 5 seconds before allowing another continuation with the same key
                }, 1000); // Wait 1 second before continuing
              } else {
                console.log(`Skipping duplicate continuation for ${newRecord.type}`);
              }
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
