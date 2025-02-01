import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { SyncCard } from "./SyncCard";
import { SyncType, SyncProgress, SyncProgressRecord } from "@/types/sync";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface SyncProgressDB {
  id: string;
  type: string;
  total: number;
  processed: number;
  last_processed: string | null;
  processed_items: string[];
  error_items: string[];
  start_time: string | null;
  is_complete: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export const SyncSection = () => {
  const [isLoading, setIsLoading] = useState<{[key: string]: boolean}>({});
  const [clearData, setClearData] = useState<{[key in keyof typeof SyncType]: boolean}>({
    airlines: false,
    airports: false,
    petPolicies: false,
    routes: false,
    countryPolicies: false
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels = Object.values(SyncType).map(syncType => {
      console.log(`Setting up real-time subscription for ${syncType}`);
      return supabase
        .channel(`sync_progress_${syncType}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sync_progress',
            filter: `type=eq.${syncType}`
          },
          (payload: RealtimePostgresChangesPayload<SyncProgressDB>) => {
            console.log(`Received sync progress update for ${syncType}:`, payload);
            const newRecord = payload.new as SyncProgressDB;
            
            if (newRecord) {
              console.log(`Updating sync progress for ${syncType}:`, newRecord);
              
              queryClient.setQueryData<SyncProgressRecord>(
                ["syncProgress"],
                (oldData) => {
                  if (!oldData) {
                    return {
                      [syncType]: {
                        total: newRecord.total,
                        processed: newRecord.processed,
                        lastProcessed: newRecord.last_processed,
                        processedItems: newRecord.processed_items || [],
                        errorItems: newRecord.error_items || [],
                        startTime: newRecord.start_time,
                        isComplete: newRecord.is_complete,
                      }
                    };
                  }

                  return {
                    ...oldData,
                    [syncType]: {
                      total: newRecord.total,
                      processed: newRecord.processed,
                      lastProcessed: newRecord.last_processed,
                      processedItems: newRecord.processed_items || [],
                      errorItems: newRecord.error_items || [],
                      startTime: newRecord.start_time,
                      isComplete: newRecord.is_complete,
                    }
                  };
                }
              );
            }
          }
        )
        .subscribe();
    });

    return () => {
      console.log('Cleaning up sync progress subscriptions');
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [queryClient]);

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

      const progressRecord = (data as SyncProgressDB[]).reduce((acc: SyncProgressRecord, curr) => {
        acc[curr.type as keyof typeof SyncType] = {
          total: curr.total,
          processed: curr.processed,
          lastProcessed: curr.last_processed,
          processedItems: curr.processed_items || [],
          errorItems: curr.error_items || [],
          startTime: curr.start_time,
          isComplete: curr.is_complete,
        };
        return acc;
      }, {});

      console.log('Processed sync progress data:', progressRecord);
      return progressRecord;
    },
    refetchInterval: 0, // Disable polling since we're using real-time updates
  });

  const handleSync = async (type: keyof typeof SyncType, resume: boolean = false) => {
    console.log(`Starting sync for ${type}, resume: ${resume}`);
    const newLoadingState = { ...isLoading, [type]: true };
    setIsLoading(newLoadingState);
    
    try {
      // Force reset progress for country policies if not resuming
      if (type === 'countryPolicies' && !resume) {
        console.log('Forcing reset of country policies sync progress');
        const { error: resetError } = await supabase
          .from('sync_progress')
          .update({
            total: 0,
            processed: 0,
            last_processed: null,
            processed_items: [],
            error_items: [],
            start_time: new Date().toISOString(),
            is_complete: false
          })
          .eq('type', type);

        if (resetError) {
          console.error('Error resetting country policies sync:', resetError);
          throw resetError;
        }

        // Clear existing country policies if requested
        if (clearData[type]) {
          console.log('Clearing existing country policies data');
          const { error: clearError } = await supabase
            .from('country_policies')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
          
          if (clearError) {
            console.error('Error clearing country policies:', clearError);
            throw clearError;
          }
        }
      }

      const currentProgress = syncProgress?.[type];
      
      // Only reset progress if not resuming and not country policies (handled above)
      if (!resume && type !== 'countryPolicies') {
        console.log(`Resetting progress for ${type}`);
        const { error: resetError } = await supabase
          .from('sync_progress')
          .upsert({
            type,
            total: 0,
            processed: 0,
            last_processed: null,
            processed_items: [],
            error_items: [],
            start_time: new Date().toISOString(),
            is_complete: false
          }, {
            onConflict: 'type'
          });

        if (resetError) throw resetError;

        if (clearData[type]) {
          console.log(`Clearing existing data for ${type}`);
          const tableName = type === 'petPolicies' ? 'pet_policies' : type;
          
          const { error: clearError } = await supabase
            .from(tableName)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
          
          if (clearError) throw clearError;
        }
      }

      const functionMap: Record<SyncType, string> = {
        airlines: 'sync_airline_data',
        airports: 'sync_airport_data',
        routes: 'sync_route_data',
        petPolicies: 'analyze_pet_policies',
        countryPolicies: 'sync_country_policies'
      };

      const functionName = functionMap[type];
      if (!functionName) {
        throw new Error(`Unknown sync type: ${type}`);
      }

      const payload = {
        lastProcessedItem: resume ? currentProgress?.lastProcessed : null,
        currentProcessed: resume ? currentProgress?.processed || 0 : 0,
        currentTotal: currentProgress?.total || 0,
        processedItems: resume ? currentProgress?.processedItems || [] : [],
        errorItems: resume ? currentProgress?.errorItems || [] : [],
        startTime: resume ? currentProgress?.startTime : new Date().toISOString(),
        batchSize: type === 'petPolicies' ? 3 : type === 'countryPolicies' ? 10 : undefined
      };

      console.log(`Invoking edge function ${functionName} with payload:`, payload);
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload
      });

      if (error) throw error;

      console.log(`Received response from ${functionName}:`, data);

      if (data) {
        const updatedProgress: SyncProgress = {
          total: data.total || currentProgress?.total || 0,
          processed: data.processed || 0,
          lastProcessed: data.continuation_token || null,
          processedItems: data.processed_items || [],
          errorItems: data.error_items || [],
          startTime: resume ? currentProgress?.startTime || new Date().toISOString() : new Date().toISOString(),
          isComplete: !data.continuation_token && data.processed === data.total
        };

        console.log(`Updating progress for ${type}:`, updatedProgress);
        
        const { error: updateError } = await supabase
          .from('sync_progress')
          .upsert({
            type,
            total: updatedProgress.total,
            processed: updatedProgress.processed,
            last_processed: updatedProgress.lastProcessed,
            processed_items: updatedProgress.processedItems,
            error_items: updatedProgress.errorItems,
            start_time: updatedProgress.startTime,
            is_complete: updatedProgress.isComplete
          }, {
            onConflict: 'type'
          });

        if (updateError) throw updateError;

        // Continue processing if there's more data and we haven't hit any limits
        if (data.continuation_token && !data.error && updatedProgress.processed < updatedProgress.total) {
          console.log(`Continuing batch processing for ${type} from ${data.continuation_token}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          await handleSync(type, true);
          return;
        }
      }

      if (!resume) {
        toast({
          title: "Sync Started",
          description: `Started synchronizing ${type} data.`,
        });
      }
    } catch (error: any) {
      console.error(`Error syncing ${type}:`, error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message || `Failed to sync ${type} data.`,
      });

      const { error: updateError } = await supabase
        .from('sync_progress')
        .update({ is_complete: true })
        .eq('type', type);

      if (updateError) {
        console.error('Error updating sync progress after failure:', updateError);
      }
    } finally {
      const finalLoadingState = { ...isLoading, [type]: false };
      setIsLoading(finalLoadingState);
    }
  };

  return (
    <div className="space-y-8">
      {Object.entries(syncProgress || {}).some(([_, progress]: [string, SyncProgress]) => 
        progress && !progress.isComplete && progress.processed < progress.total
      ) && (
        <div className="bg-accent/20 p-4 rounded-lg mb-8">
          <h3 className="text-lg font-semibold mb-2">Active Syncs</h3>
          <div className="space-y-2">
            {Object.entries(syncProgress || {}).map(([type, progress]: [string, SyncProgress]) => 
              progress && !progress.isComplete && progress.processed < progress.total && (
                <div key={type} className="text-sm">
                  {type}: {progress.processed} of {progress.total} items processed
                </div>
              )
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {Object.entries(SyncType).map(([key, value]) => (
          <SyncCard
            key={key}
            title={`${key.replace(/([A-Z])/g, ' $1').trim()} Synchronization`}
            clearData={clearData[key as keyof typeof SyncType]}
            onClearDataChange={(checked) => {
              setClearData(prev => ({ ...prev, [key]: checked }));
            }}
            isLoading={isLoading[value]}
            onSync={(resume) => handleSync(key as keyof typeof SyncType, resume)}
            syncProgress={syncProgress?.[value]}
          />
        ))}
      </div>
    </div>
  );
};

export default SyncSection;
