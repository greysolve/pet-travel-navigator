import { useState, useEffect } from "react";
import { SyncCard } from "./SyncCard";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface SyncProgress {
  total: number;
  processed: number;
  lastProcessed: string | null;
  processedItems: string[];
  errorItems: string[];
  startTime: string | null;
  isComplete: boolean;
}

interface SyncSectionProps {
  syncProgress: {
    [key: string]: SyncProgress;
  };
  isLoading: {
    [key: string]: boolean;
  };
  setSyncProgress: (progress: { [key: string]: SyncProgress }) => void;
  setIsLoading: (loading: { [key: string]: boolean }) => void;
}

type SyncType = 'airlines' | 'airports' | 'petPolicies' | 'routes' | 'countryPolicies';

export const SyncSection = ({ 
  syncProgress, 
  isLoading,
  setSyncProgress,
  setIsLoading 
}: SyncSectionProps) => {
  const [clearData, setClearData] = useState<{[key in SyncType]: boolean}>({
    airlines: false,
    airports: false,
    petPolicies: false,
    routes: false,
    countryPolicies: false
  });

  const updateSyncProgress = async (type: string, progress: SyncProgress) => {
    try {
      console.log(`Updating sync progress for ${type}:`, progress);
      
      const { error } = await supabase
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
        });

      if (error) {
        console.error('Error inserting sync progress:', error);
        throw error;
      }
      
      console.log('Previous sync progress:', syncProgress);
      const updatedProgress = {
        ...syncProgress,
        [type]: progress
      };
      console.log('Setting new sync progress:', updatedProgress);
      setSyncProgress(updatedProgress);
    } catch (error: any) {
      console.error('Error updating sync progress:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update sync progress.",
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

        let continuationToken = resume ? syncProgress.countryPolicies?.lastProcessed : null;
        let completed = false;

        while (!completed) {
          console.log('Processing country policies batch, token:', continuationToken);
          const { data, error } = await supabase.functions.invoke('sync_country_policies', {
            body: { lastProcessedCountry: continuationToken }
          });

          if (error) throw error;

          if (data.total_countries > 0) {
            const updatedProgress: SyncProgress = {
              ...syncProgress.countryPolicies,
              total: data.total_countries,
              processed: (syncProgress.countryPolicies?.processed || 0) + data.processed_policies,
              lastProcessed: data.continuation_token,
              processedItems: [...(syncProgress.countryPolicies?.processedItems || []), ...data.processed_countries],
              errorItems: [...(syncProgress.countryPolicies?.errorItems || []), ...data.error_countries],
              isComplete: !data.continuation_token
            };

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <SyncCard
        title="Airlines Synchronization"
        clearData={clearData.airlines}
        onClearDataChange={(checked) => {
          setClearData(prev => ({ ...prev, airlines: checked }));
        }}
        isLoading={isLoading.airlines}
        onSync={() => handleSync('airlines')}
        syncProgress={syncProgress.airlines}
      />

      <SyncCard
        title="Airports Synchronization"
        clearData={clearData.airports}
        onClearDataChange={(checked) => {
          setClearData(prev => ({ ...prev, airports: checked }));
        }}
        isLoading={isLoading.airports}
        onSync={() => handleSync('airports')}
        syncProgress={syncProgress.airports}
      />

      <SyncCard
        title="Pet Policies Synchronization"
        clearData={clearData.petPolicies}
        onClearDataChange={(checked) => {
          setClearData(prev => ({ ...prev, petPolicies: checked }));
        }}
        isLoading={isLoading.petPolicies}
        onSync={(resume) => handleSync('petPolicies', resume)}
        syncProgress={syncProgress.petPolicies}
      />

      <SyncCard
        title="Routes Synchronization"
        clearData={clearData.routes}
        onClearDataChange={(checked) => {
          setClearData(prev => ({ ...prev, routes: checked }));
        }}
        isLoading={isLoading.routes}
        onSync={() => handleSync('routes')}
        syncProgress={syncProgress.routes}
      />

      <SyncCard
        title="Country Policies Synchronization"
        clearData={clearData.countryPolicies}
        onClearDataChange={(checked) => {
          setClearData(prev => ({ ...prev, countryPolicies: checked }));
        }}
        isLoading={isLoading.countryPolicies}
        onSync={(resume) => handleSync('countryPolicies', resume)}
        syncProgress={syncProgress.countryPolicies}
      />
    </div>
  );
};
