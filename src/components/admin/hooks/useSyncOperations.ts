import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { SyncType } from "@/types/sync";

export const useSyncOperations = () => {
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState<{[key: string]: boolean}>({});
  const [clearData, setClearData] = useState<{[key in keyof typeof SyncType]: boolean}>({
    airlines: false,
    airports: false,
    petPolicies: false,
    routes: false,
    countryPolicies: false
  });
  const queryClient = useQueryClient();

  const resetSyncProgressCache = async (type: keyof typeof SyncType) => {
    console.log(`Resetting sync progress cache for ${type}`);
    await queryClient.invalidateQueries({ queryKey: ["syncProgress"] });
  };

  const clearSyncProgress = async (type: keyof typeof SyncType) => {
    console.log(`Clearing sync progress for ${type}`);
    const { error } = await supabase
      .from('sync_progress')
      .upsert({
        type,
        total: 0,
        processed: 0,
        last_processed: null,
        processed_items: [],
        error_items: [],
        start_time: new Date().toISOString(),
        is_complete: true,
        needs_continuation: false
      }, {
        onConflict: 'type'
      });

    if (error) {
      console.error(`Error clearing sync progress for ${type}:`, error);
      throw error;
    }
  };

  const processPetPoliciesChunk = async (offset: number = 0, mode: string = 'clear', resumeToken: string | null = null) => {
    console.log(`Processing pet policies chunk with offset ${offset}, mode ${mode}, resumeToken: ${resumeToken}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze_pet_policies', {
        body: { offset, mode, resumeToken }
      });

      if (error) throw error;

      console.log('Chunk processing result:', data);

      if (data.has_more) {
        console.log(`More chunks remaining, scheduling next chunk at offset ${data.next_offset}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await processPetPoliciesChunk(data.next_offset, mode, data.resume_token);
      } else {
        console.log('All chunks processed');
        setIsInitializing(prev => ({ ...prev, petPolicies: false }));
        toast({
          title: "Pet Policies Sync Complete",
          description: `Successfully processed all pet policies.`,
        });
      }

    } catch (error: any) {
      console.error('Error processing chunk:', error);
      toast({
        variant: "destructive",
        title: "Chunk Processing Error",
        description: error.message || "Failed to process pet policies chunk.",
      });
      setIsInitializing(prev => ({ ...prev, petPolicies: false }));
    }
  };

  const processCountryPolicies = async (resume: boolean = false) => {
    try {
      const { data: response, error } = await supabase.functions.invoke('sync_country_policies', {
        body: { 
          fullSync: true,
          resume,
          clearData: clearData.countryPolicies
        }
      });

      if (error) throw error;

      // If more countries need to be processed, schedule the next batch
      if (!response.isComplete && response.nextBatch !== null) {
        console.log('Scheduling next batch of countries...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Add delay between batches
        await processCountryPolicies(true);
      } else {
        console.log('Country policies sync completed');
        setIsInitializing(prev => ({ ...prev, countryPolicies: false }));
        toast({
          title: "Country Policies Sync Complete",
          description: "Successfully processed all country policies.",
        });
      }
    } catch (error: any) {
      console.error('Error in processCountryPolicies:', error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message || "Failed to sync country policies.",
      });
      setIsInitializing(prev => ({ ...prev, countryPolicies: false }));
    }
  };

  const handleSync = async (type: keyof typeof SyncType, resume: boolean = false, mode?: string) => {
    console.log(`Starting sync for ${type}, resume: ${resume}, mode: ${mode}, clearData: ${clearData[type]}`);
    setIsInitializing(prev => ({ ...prev, [type]: true }));
    
    try {
      // If clearing data is requested and not resuming, reset sync progress first
      if (clearData[type] && !resume) {
        await clearSyncProgress(type);
      }

      // Special handling for pet policies to use chunked processing
      if (type === 'petPolicies') {
        const { data: currentProgress, error: progressError } = await supabase
          .from('sync_progress')
          .select('*')
          .eq('type', type)
          .maybeSingle();

        if (progressError && progressError.code !== 'PGRST116') {
          throw progressError;
        }

        if (resume && currentProgress?.needs_continuation) {
          console.log('Resuming from previous progress:', currentProgress);
          await processPetPoliciesChunk(
            currentProgress.processed, 
            mode || 'clear',
            currentProgress.resume_token
          );
        } else {
          if (!resume) {
            console.log('Starting new sync');
            // Only clear data if explicitly requested and not resuming
            if (clearData[type]) {
              console.log(`Clearing existing data for ${type}`);
              const { error: clearError } = await supabase
                .from('pet_policies')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');
              
              if (clearError) throw clearError;
            }
          }
          await processPetPoliciesChunk(0, mode);
        }
        return;
      }

      // Special handling for country policies
      if (type === 'countryPolicies') {
        await processCountryPolicies(resume);
        return;
      }

      // Handle other sync types with existing logic
      const functionMap: Record<keyof typeof SyncType, string> = {
        airlines: 'sync_airline_data',
        airports: 'sync_airport_data',
        routes: 'sync_route_data',
        petPolicies: 'analyze_pet_policies',
        countryPolicies: 'sync_country_policies'
      };

      const { error } = await supabase.functions.invoke(functionMap[type]);
      if (error) throw error;

      toast({
        title: "Sync Started",
        description: `Started synchronizing ${type} data${mode ? ` for ${mode}` : ''}.`,
      });

      // Invalidate sync progress cache
      await resetSyncProgressCache(type);

    } catch (error: any) {
      console.error(`Error syncing ${type}:`, error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message || `Failed to sync ${type} data.`,
      });
    } finally {
      if (type !== 'petPolicies' && type !== 'countryPolicies') {
        setIsInitializing(prev => ({ ...prev, [type]: false }));
      }
    }
  };

  return {
    isInitializing,
    clearData,
    setClearData,
    handleSync
  };
};
