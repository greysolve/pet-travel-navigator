import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SyncCard } from "./SyncCard";
import { SyncType, SyncProgress, SyncProgressRecord } from "@/types/sync";

interface SyncProgressDBRecord {
  created_at: string;
  type: string;
  total: number;
  processed: number;
  last_processed: string | null;
  processed_items: string[];
  error_items: string[];
  start_time: string | null;
  is_complete: boolean;
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

  const { data: syncProgress, error } = useQuery<SyncProgressRecord>({
    queryKey: ["syncProgress"],
    queryFn: async () => {
      console.log('DEBUG: Starting to fetch sync progress...');
      const { data, error } = await supabase
        .from('sync_progress')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sync progress:', error);
        throw error;
      }

      console.log('DEBUG: Raw sync progress data:', data);

      // Find the latest active sync session for each type
      const progressByType = (data as SyncProgressDBRecord[]).reduce((acc: SyncProgressRecord, curr) => {
        if (!acc[curr.type] || 
            (!curr.is_complete && curr.start_time && 
             (!acc[curr.type].startTime || 
              new Date(curr.start_time) > new Date(acc[curr.type].startTime!)))) {
          acc[curr.type] = {
            total: curr.total,
            processed: curr.processed,
            lastProcessed: curr.last_processed,
            processedItems: curr.processed_items || [],
            errorItems: curr.error_items || [],
            startTime: curr.start_time,
            isComplete: curr.is_complete,
          };
        }
        return acc;
      }, {});

      console.log('DEBUG: Processed sync progress by type:', progressByType);
      return progressByType;
    },
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const updateSyncProgress = async (type: string, progress: SyncProgress) => {
    try {
      console.log('DEBUG: Attempting to update sync progress:', {
        type,
        progress,
        currentSyncProgress: syncProgress
      });
      
      // First try to update existing record
      const { data: existingData, error: existingError } = await supabase
        .from('sync_progress')
        .select('*')
        .eq('type', type)
        .eq('start_time', progress.startTime)
        .eq('is_complete', false)
        .maybeSingle();

      if (existingError) {
        console.error('DEBUG: Error checking existing sync progress:', existingError);
        throw existingError;
      }

      let result;
      if (existingData) {
        // Update existing record
        const { data, error } = await supabase
          .from('sync_progress')
          .update({
            total: progress.total,
            processed: progress.processed,
            last_processed: progress.lastProcessed,
            processed_items: progress.processedItems,
            error_items: progress.errorItems,
            is_complete: progress.isComplete
          })
          .eq('id', existingData.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('sync_progress')
          .insert({
            type,
            total: progress.total,
            processed: progress.processed,
            last_processed: progress.lastProcessed,
            processed_items: progress.processedItems,
            error_items: progress.errorItems,
            start_time: progress.startTime,
            is_complete: progress.isComplete
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }
      
      console.log('DEBUG: Successfully updated sync progress:', result);
      
      // Update the cache
      queryClient.setQueryData<SyncProgressRecord>(["syncProgress"], (old) => ({
        ...old,
        [type]: progress
      }));
      
    } catch (error: any) {
      console.error('DEBUG: Error in updateSyncProgress:', error);
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

        let continuationToken = resume ? syncProgress.petPolicies?.lastProcessed : null;
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
            ...syncProgress.petPolicies,
            processed: (syncProgress.petPolicies?.processed || 0) + data.processed_count,
            lastProcessed: data.continuation_token,
            processedItems: [...(syncProgress.petPolicies?.processedItems || []), ...data.processed_airlines],
            errorItems: [...(syncProgress.petPolicies?.errorItems || []), ...data.error_airlines],
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
