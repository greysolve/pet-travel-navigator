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

  // Function to reset sync progress cache
  const resetSyncProgressCache = async (type: keyof typeof SyncType) => {
    console.log(`Resetting sync progress cache for ${type}`);
    await queryClient.invalidateQueries({ queryKey: ["syncProgress"] });
    setIsLoading(prev => ({ ...prev, [type]: false }));
  };

  // Function to reset sync progress in the database
  const resetSyncProgress = async (type: keyof typeof SyncType) => {
    console.log(`Resetting sync progress for ${type} in database`);
    const { error } = await supabase
      .from('sync_progress')
      .delete()
      .eq('type', type);

    if (error) {
      console.error(`Error resetting sync progress for ${type}:`, error);
      throw error;
    }
  };

  useEffect(() => {
    // Create a single channel for all sync types
    const channel = supabase
      .channel('sync_progress_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_progress'
        },
        (payload: RealtimePostgresChangesPayload<SyncProgressDB>) => {
          console.log(`Received sync progress update:`, payload);
          const newRecord = payload.new as SyncProgressDB;
          
          if (newRecord) {
            console.log(`Updating sync progress for ${newRecord.type}:`, newRecord);
            
            queryClient.setQueryData<SyncProgressRecord>(
              ["syncProgress"],
              (oldData) => {
                if (!oldData) {
                  return {
                    [newRecord.type]: {
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
                  [newRecord.type]: {
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

    return () => {
      console.log('Cleaning up sync progress subscription');
      supabase.removeChannel(channel);
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
  });

  const handleSync = async (type: keyof typeof SyncType, resume: boolean = false) => {
    console.log(`Starting sync for ${type}, resume: ${resume}`);
    setIsLoading(prev => ({ ...prev, [type]: true }));
    
    try {
      // If not resuming, reset the progress first
      if (!resume) {
        console.log(`Resetting progress for ${type}`);
        await resetSyncProgress(type);
        await resetSyncProgressCache(type);

        if (clearData[type]) {
          console.log(`Clearing existing data for ${type}`);
          const tableNameMap: Record<keyof typeof SyncType, string> = {
            airlines: 'airlines',
            airports: 'airports',
            petPolicies: 'pet_policies',
            routes: 'routes',
            countryPolicies: 'country_policies'
          };
          
          const tableName = tableNameMap[type];
          console.log(`Clearing data from table: ${tableName}`);
          
          const { error: clearError } = await supabase
            .from(tableName)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
          
          if (clearError) {
            console.error(`Error clearing ${tableName}:`, clearError);
            throw clearError;
          }
        }
      }

      const functionMap: Record<keyof typeof SyncType, string> = {
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

      const currentProgress = syncProgress?.[type];
      const payload = {
        lastProcessedItem: resume ? currentProgress?.lastProcessed : null,
        currentProcessed: resume ? currentProgress?.processed || 0 : 0,
        currentTotal: resume ? currentProgress?.total || 0 : 0,
        processedItems: resume ? currentProgress?.processedItems || [] : [],
        errorItems: resume ? currentProgress?.errorItems || [] : [],
        startTime: resume ? currentProgress?.startTime : new Date().toISOString(),
      };

      console.log(`Invoking edge function ${functionName} with payload:`, payload);
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload
      });

      if (error) throw error;

      console.log(`Received response from ${functionName}:`, data);

      // If the response indicates we should reset, do so
      if (data?.shouldReset) {
        console.log('Response indicates sync completion, resetting state...');
        await resetSyncProgress(type);
        await resetSyncProgressCache(type);
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

      // Reset progress on error
      await resetSyncProgress(type);
      await resetSyncProgressCache(type);
    } finally {
      setIsLoading(prev => ({ ...prev, [type]: false }));
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