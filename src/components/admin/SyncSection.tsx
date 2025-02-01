import { useState } from "react";
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
}

export const SyncSection = ({ syncProgress, isLoading }: SyncSectionProps) => {
  const [clearData, setClearData] = useState<{[key: string]: boolean}>({
    airlines: false,
    airports: false,
    petPolicies: false,
    routes: false,
    countryPolicies: false
  });

  const handleSync = async (type: 'airlines' | 'airports' | 'petPolicies' | 'routes' | 'countryPolicies', resume: boolean = false) => {
    setIsLoading(prev => ({ ...prev, [type]: true }));
    try {
      if (!resume && clearData[type]) {
        const { error: clearError } = await supabase
          .from(type === 'countryPolicies' ? 'country_policies' : type)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (clearError) throw clearError;
      }

      if (type === 'petPolicies') {
        // Initialize or resume progress
        if (!resume) {
          const { data: airlines } = await supabase
            .from('airlines')
            .select('id, name, website')
            .eq('active', true);

          const initialProgress = {
            total: airlines?.length || 0,
            processed: 0,
            lastProcessed: null,
            processedItems: [],
            errorItems: [],
            startTime: new Date().toISOString(),
            isComplete: false
          };

          await updateSyncProgress('petPolicies', initialProgress);
          setSyncProgress(prev => ({ ...prev, petPolicies: initialProgress }));
        }

        let continuationToken = resume ? syncProgress.petPolicies?.lastProcessed : null;
        let completed = false;

        while (!completed) {
          const { data, error } = await supabase.functions.invoke('analyze_pet_policies', {
            body: {
              lastProcessedAirline: continuationToken,
              batchSize: 3
            }
          });

          if (error) throw error;

          const updatedProgress = {
            ...syncProgress.petPolicies,
            processed: (syncProgress.petPolicies?.processed || 0) + data.processed_count,
            lastProcessed: data.continuation_token,
            processedItems: [...(syncProgress.petPolicies?.processedItems || []), ...data.processed_airlines],
            errorItems: [...(syncProgress.petPolicies?.errorItems || []), ...data.error_airlines],
            isComplete: !data.continuation_token
          };

          await updateSyncProgress('petPolicies', updatedProgress);
          setSyncProgress(prev => ({ ...prev, petPolicies: updatedProgress }));

          if (data.continuation_token) {
            continuationToken = data.continuation_token;
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            completed = true;
          }
        }
      } else if (type === 'countryPolicies') {
        // Initialize progress
        if (!resume) {
          const initialProgress = {
            total: 0,
            processed: 0,
            lastProcessed: null,
            processedItems: [],
            errorItems: [],
            startTime: new Date().toISOString(),
            isComplete: false
          };

          await updateSyncProgress('countryPolicies', initialProgress);
          setSyncProgress(prev => ({ ...prev, countryPolicies: initialProgress }));
        }

        let continuationToken = resume ? syncProgress.countryPolicies?.lastProcessed : null;
        let completed = false;

        while (!completed) {
          const { data, error } = await supabase.functions.invoke('sync_country_policies', {
            body: { lastProcessedCountry: continuationToken }
          });

          if (error) throw error;

          if (data.total_countries > 0) {
            const updatedProgress = {
              ...syncProgress.countryPolicies,
              total: data.total_countries,
              processed: (syncProgress.countryPolicies?.processed || 0) + data.processed_policies,
              lastProcessed: data.continuation_token,
              processedItems: [...(syncProgress.countryPolicies?.processedItems || []), ...data.processed_countries],
              errorItems: [...(syncProgress.countryPolicies?.errorItems || []), ...data.error_countries],
              isComplete: !data.continuation_token
            };

            await updateSyncProgress('countryPolicies', updatedProgress);
            setSyncProgress(prev => ({ ...prev, countryPolicies: updatedProgress }));
          }

          if (data.continuation_token) {
            continuationToken = data.continuation_token;
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            completed = true;
          }
        }
      } else {
        // Handle other sync types
        const functionName = type === 'airlines' 
          ? 'sync_airline_data' 
          : type === 'airports' 
            ? 'sync_airport_data' 
            : 'sync_route_data';

        const { data, error } = await supabase.functions.invoke(functionName);
        if (error) throw error;

        // Update progress for other sync types
        await updateSyncProgress(type, {
          total: 1,
          processed: 1,
          lastProcessed: null,
          processedItems: [],
          errorItems: [],
          startTime: new Date().toISOString(),
          isComplete: true
        });
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
      setIsLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <SyncCard
        title="Airlines Synchronization"
        clearData={clearData.airlines}
        onClearDataChange={(checked) => 
          setClearData(prev => ({ ...prev, airlines: checked }))
        }
        isLoading={isLoading.airlines}
        onSync={() => handleSync('airlines')}
        syncProgress={syncProgress.airlines}
      />

      <SyncCard
        title="Airports Synchronization"
        clearData={clearData.airports}
        onClearDataChange={(checked) => 
          setClearData(prev => ({ ...prev, airports: checked }))
        }
        isLoading={isLoading.airports}
        onSync={() => handleSync('airports')}
        syncProgress={syncProgress.airports}
      />

      <SyncCard
        title="Pet Policies Synchronization"
        clearData={clearData.petPolicies}
        onClearDataChange={(checked) => 
          setClearData(prev => ({ ...prev, petPolicies: checked }))
        }
        isLoading={isLoading.petPolicies}
        onSync={(resume) => handleSync('petPolicies', resume)}
        syncProgress={syncProgress.petPolicies}
      />

      <SyncCard
        title="Routes Synchronization"
        clearData={clearData.routes}
        onClearDataChange={(checked) => 
          setClearData(prev => ({ ...prev, routes: checked }))
        }
        isLoading={isLoading.routes}
        onSync={() => handleSync('routes')}
        syncProgress={syncProgress.routes}
      />

      <SyncCard
        title="Country Policies Synchronization"
        clearData={clearData.countryPolicies}
        onClearDataChange={(checked) => 
          setClearData(prev => ({ ...prev, countryPolicies: checked }))
        }
        isLoading={isLoading.countryPolicies}
        onSync={(resume) => handleSync('countryPolicies', resume)}
        syncProgress={syncProgress.countryPolicies}
      />
    </div>
  );
};
