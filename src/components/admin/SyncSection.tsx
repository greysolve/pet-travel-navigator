import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SyncCard } from "./SyncCard";
import { SyncType, SyncProgress, SyncProgressRecord } from "@/types/sync";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// Define the database record type
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
          const newRecord = payload.new;
          if (newRecord) {
            queryClient.setQueryData<SyncProgressRecord>(
              ["syncProgress"],
              (old) => ({
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
              })
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

  const { data: syncProgress, error } = useQuery<SyncProgressRecord>({
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

      return data.reduce((acc: SyncProgressRecord, curr) => {
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
    },
  });

  const updateSyncProgress = async (type: string, progress: SyncProgress) => {
    try {
      console.log('Updating sync progress:', { type, progress });
      
      const { error } = await supabase
        .from('sync_progress')
        .upsert({
          type,
          total: progress.total,
          processed: progress.processed,
          last_processed: progress.lastProcessed,
          processed_items: progress.processedItems,
          error_items: progress.errorItems,
          start_time: progress.startTime,
          is_complete: progress.isComplete
        }, {
          onConflict: 'type'
        });

      if (error) throw error;
      
      console.log('Successfully updated sync progress');
      
    } catch (error: any) {
      console.error('Error in updateSyncProgress:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update sync progress: ${error.message}`,
      });
    }
  };

  const handleSync = async (type: SyncType, resume: boolean = false) => {
    console.log(`Starting sync for ${type}, resume: ${resume}`);
    const newLoadingState = { ...isLoading, [type]: true };
    setIsLoading(newLoadingState);
    
    try {
      if (!resume && clearData[type]) {
        console.log(`Clearing existing data for ${type}`);
        const { error: clearError } = await supabase
          .from(type === 'countryPolicies' ? 'country_policies' : type)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (clearError) throw clearError;
      }

      if (type === 'petPolicies') {
        if (!resume) {
          console.log('Initializing pet policies sync');
          const { data: airlines } = await supabase
            .from('airlines')
            .select('id, name, website')
            .eq('active', true);

          const initialProgress: SyncProgress = {
            total: airlines?.length || 0,
            processed: 0,
            lastProcessed: null,
            processedItems: [],
            errorItems: [],
            startTime: new Date().toISOString(),
            isComplete: false
          };

          await updateSyncProgress('petPolicies', initialProgress);
        }

        let continuationToken = resume ? syncProgress?.petPolicies?.lastProcessed : null;
        let completed = false;

        while (!completed) {
          console.log('Processing pet policies batch, token:', continuationToken);
          const { data, error } = await supabase.functions.invoke('analyze_pet_policies', {
            body: {
              lastProcessedAirline: continuationToken,
              batchSize: 3
            }
          });

          if (error) throw error;

          const updatedProgress: SyncProgress = {
            ...syncProgress?.petPolicies,
            processed: (syncProgress?.petPolicies?.processed || 0) + data.processed_count,
            lastProcessed: data.continuation_token,
            processedItems: [...(syncProgress?.petPolicies?.processedItems || []), ...data.processed_airlines],
            errorItems: [...(syncProgress?.petPolicies?.errorItems || []), ...data.error_airlines],
            isComplete: !data.continuation_token
          };

          await updateSyncProgress('petPolicies', updatedProgress);

          if (data.continuation_token) {
            continuationToken = data.continuation_token;
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            completed = true;
          }
        }
      } else if (type === 'countryPolicies') {
        if (!resume) {
          console.log('Initializing country policies sync');
          const initialProgress: SyncProgress = {
            total: 0,
            processed: 0,
            lastProcessed: null,
            processedItems: [],
            errorItems: [],
            startTime: new Date().toISOString(),
            isComplete: false
          };

          await updateSyncProgress('countryPolicies', initialProgress);
        }

        let continuationToken = resume ? syncProgress?.countryPolicies?.lastProcessed : null;
        let completed = false;

        while (!completed) {
          console.log('Processing country policies batch, token:', continuationToken);
          const { data, error } = await supabase.functions.invoke('sync_country_policies', {
            body: { lastProcessedCountry: continuationToken }
          });

          if (error) throw error;

          console.log('DEBUG: Received response from sync_country_policies:', data);

          if (data.total_countries > 0) {
            const updatedProgress: SyncProgress = {
              total: data.total_countries,
              processed: (syncProgress?.countryPolicies?.processed || 0) + data.processed_policies,
              lastProcessed: data.continuation_token,
              processedItems: [...(syncProgress?.countryPolicies?.processedItems || []), ...data.processed_countries],
              errorItems: [...(syncProgress?.countryPolicies?.errorItems || []), ...data.error_countries],
              startTime: syncProgress?.countryPolicies?.startTime || new Date().toISOString(),
              isComplete: !data.continuation_token
            };

            console.log('DEBUG: Updating progress:', updatedProgress);
            await updateSyncProgress('countryPolicies', updatedProgress);
          }

          if (data.continuation_token) {
            continuationToken = data.continuation_token;
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            completed = true;
          }
        }
      } else {
        const functionName = type === 'airlines' 
          ? 'sync_airline_data' 
          : type === 'airports' 
            ? 'sync_airport_data' 
            : 'sync_route_data';

        const { data, error } = await supabase.functions.invoke(functionName);
        if (error) throw error;

        const syncProgressData: SyncProgress = {
          total: 1,
          processed: 1,
          lastProcessed: null,
          processedItems: [],
          errorItems: [],
          startTime: new Date().toISOString(),
          isComplete: true
        };

        await updateSyncProgress(type, syncProgressData);
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
      {Object.keys(syncProgress || {}).length > 0 && (
        <div className="bg-accent/20 p-4 rounded-lg mb-8">
          <h3 className="text-lg font-semibold mb-2">Active Syncs</h3>
          <div className="space-y-2">
            {Object.entries(syncProgress || {}).map(([type, progress]) => !progress.isComplete && (
              <div key={type} className="text-sm">
                {type}: {progress.processed} of {progress.total} items processed
              </div>
            ))}
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
