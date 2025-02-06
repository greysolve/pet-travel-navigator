
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
          : type === 'airlines' 
          ? { mode: mode || 'clear' }
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
      setIsInitializing(prev => ({ ...prev, [type]: false }));
    }
  };

  return {
    isInitializing,
    clearData,
    setClearData,
    handleSync
  };
};

