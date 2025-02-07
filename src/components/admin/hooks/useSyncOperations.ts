
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { SyncType } from "@/types/sync";

export const useSyncOperations = () => {
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

  const processPetPoliciesChunk = async (offset: number = 0, mode: string = 'clear') => {
    console.log(`Processing pet policies chunk with offset ${offset}, mode ${mode}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze_pet_policies', {
        body: { offset, mode }
      });

      if (error) throw error;

      console.log('Chunk processing result:', data);

      if (data.has_more) {
        console.log(`More chunks remaining, scheduling next chunk at offset ${data.next_offset}`);
        // Schedule next chunk with a small delay
        setTimeout(() => {
          processPetPoliciesChunk(data.next_offset, mode);
        }, 1000);
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

  const handleSync = async (type: keyof typeof SyncType, resume: boolean = false, mode?: string) => {
    console.log(`Starting sync for ${type}, resume: ${resume}, mode: ${mode}`);
    setIsInitializing(prev => ({ ...prev, [type]: true }));
    
    try {
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

      // Special handling for pet policies to use chunked processing
      if (type === 'petPolicies') {
        await processPetPoliciesChunk(0, mode);
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

      const { error } = await supabase.functions.invoke(functionMap[type], {
        body: type === 'countryPolicies' && mode === 'country' 
          ? { country: mode }
          : undefined
      });

      if (error) throw error;

      toast({
        title: "Sync Started",
        description: `Started synchronizing ${type} data${mode ? ` for ${mode}` : ''}.`,
      });
    } catch (error: any) {
      console.error(`Error syncing ${type}:`, error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message || `Failed to sync ${type} data.`,
      });

      await resetSyncProgress(type);
      await resetSyncProgressCache(type);
    } finally {
      if (type !== 'petPolicies') {
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
