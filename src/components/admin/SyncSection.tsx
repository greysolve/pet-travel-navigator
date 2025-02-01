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
  const [clearData, setClearData] = useState<{[key in SyncType]: boolean}>({
    airlines: false,
    airports: false,
    petPolicies: false,
    routes: false,
    countryPolicies: false
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('Setting up real-time subscription for sync progress');
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
          console.log('Received sync progress update:', payload);
          const newRecord = payload.new as SyncProgressDB;
          
          if (newRecord && 'type' in newRecord) {
            console.log('Updating sync progress in React Query cache:', newRecord);
            queryClient.setQueryData<SyncProgressRecord>(
              ["syncProgress"],
              (old) => {
                if (!old) return {};
                const updated = {
                  ...old,
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
                console.log('Updated sync progress state:', updated);
                return updated;
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

  const { data: syncProgress, error } = useQuery({
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

      const progressRecord = data.reduce((acc: SyncProgressRecord, curr) => {
        acc[curr.type] = {
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
    staleTime: 0,
    refetchInterval: 5000,
  });

  const handleSync = async (type: SyncType, resume: boolean = false) => {
    console.log(`Starting sync for ${type}, resume: ${resume}`);
    const newLoadingState = { ...isLoading, [type]: true };
    setIsLoading(newLoadingState);
    
    try {
      if (!resume && clearData[type]) {
        console.log(`Clearing existing data for ${type}`);
        const tableName = type === 'countryPolicies' ? 'country_policies' : 
                         type === 'petPolicies' ? 'pet_policies' : type;
        
        const { error: clearError } = await supabase
          .from(tableName)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (clearError) throw clearError;
      }

      // Map sync types to their corresponding function names
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
        lastProcessedItem: resume ? syncProgress?.[type]?.lastProcessed : null,
        batchSize: type === 'petPolicies' ? 3 : type === 'countryPolicies' ? 10 : undefined
      };

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload
      });

      if (error) throw error;

      // Handle the response in a unified way
      if (data.total) {
        const updatedProgress: SyncProgress = {
          total: data.total_airlines || data.total_countries || data.total || 1,
          processed: data.processed_count || data.processed_policies || data.processed || 1,
          lastProcessed: data.continuation_token || null,
          processedItems: data.processed_airlines || data.processed_countries || [],
          errorItems: data.error_airlines || data.error_countries || [],
          startTime: syncProgress?.[type]?.startTime || new Date().toISOString(),
          isComplete: !data.continuation_token
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

        // If there's more to process and this is a batch-based sync
        if (data.continuation_token && (type === 'petPolicies' || type === 'countryPolicies')) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          await handleSync(type, true);
          return;
        }
      }

      toast({
        title: "Sync Successful",
        description: `Successfully synchronized ${type} data.`,
      });
    } catch (error: any) {
      console.error(`Error syncing ${type}:`, error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message || `Failed to sync ${type} data.`,
      });
    } finally {
      const finalLoadingState = { ...isLoading, [type]: false };
      setIsLoading(finalLoadingState);
    }
  };

  return (
    <div className="space-y-8">
      {Object.entries(syncProgress || {}).some(([_, progress]) => 
        progress && !progress.isComplete
      ) && (
        <div className="bg-accent/20 p-4 rounded-lg mb-8">
          <h3 className="text-lg font-semibold mb-2">Active Syncs</h3>
          <div className="space-y-2">
            {Object.entries(syncProgress || {}).map(([type, progress]) => 
              progress && !progress.isComplete && (
                <div key={type} className="text-sm">
                  {type}: {progress.processed} of {progress.total} items processed
                </div>
              )
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SyncCard
          title="Airlines Synchronization"
          clearData={clearData.airlines}
          onClearDataChange={(checked) => {
            setClearData(prev => ({ ...prev, airlines: checked }));
          }}
          isLoading={isLoading.airlines}
          onSync={() => handleSync('airlines')}
          syncProgress={syncProgress?.airlines}
        />

        <SyncCard
          title="Airports Synchronization"
          clearData={clearData.airports}
          onClearDataChange={(checked) => {
            setClearData(prev => ({ ...prev, airports: checked }));
          }}
          isLoading={isLoading.airports}
          onSync={() => handleSync('airports')}
          syncProgress={syncProgress?.airports}
        />

        <SyncCard
          title="Pet Policies Synchronization"
          clearData={clearData.petPolicies}
          onClearDataChange={(checked) => {
            setClearData(prev => ({ ...prev, petPolicies: checked }));
          }}
          isLoading={isLoading.petPolicies}
          onSync={(resume) => handleSync('petPolicies', resume)}
          syncProgress={syncProgress?.petPolicies}
        />

        <SyncCard
          title="Routes Synchronization"
          clearData={clearData.routes}
          onClearDataChange={(checked) => {
            setClearData(prev => ({ ...prev, routes: checked }));
          }}
          isLoading={isLoading.routes}
          onSync={() => handleSync('routes')}
          syncProgress={syncProgress?.routes}
        />

        <SyncCard
          title="Country Policies Synchronization"
          clearData={clearData.countryPolicies}
          onClearDataChange={(checked) => {
            setClearData(prev => ({ ...prev, countryPolicies: checked }));
          }}
          isLoading={isLoading.countryPolicies}
          onSync={(resume) => handleSync('countryPolicies', resume)}
          syncProgress={syncProgress?.countryPolicies}
        />
      </div>
    </div>
  );
};