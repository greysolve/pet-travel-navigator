
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

  const handleSyncResponse = async (
    response: { data: any; error: any },
    type: keyof typeof SyncType,
    mode: string,
    offset: number = 0
  ) => {
    if (response.error) {
      console.error(`Error syncing ${type}:`, response.error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: response.error.message || `Failed to sync ${type} data.`,
      });
      setIsInitializing(prev => ({ ...prev, [type]: false }));
      return;
    }

    // Check if we need to continue processing
    if (response.data?.progress?.needs_continuation) {
      console.log(`More data to process for ${type}, continuing...`);
      const nextOffset = response.data.progress.next_offset;
      
      // Add a small delay before the next batch
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Continue with the next batch, preserving the original mode
      await handleSync(type, true, mode, nextOffset);
    }

    console.log(`Sync completed for ${type}`);
    toast({
      title: "Sync Complete",
      description: `Successfully synchronized ${type} data.`,
    });
    setIsInitializing(prev => ({ ...prev, [type]: false }));
    await resetSyncProgressCache(type);
  };

  const handleSync = async (
    type: keyof typeof SyncType, 
    resume: boolean = false,
    mode: string = 'clear',
    offset: number = 0
  ) => {
    console.log(`Starting sync for ${type}, resume: ${resume}, mode: ${mode}, offset: ${offset}`);
    setIsInitializing(prev => ({ ...prev, [type]: true }));
    
    try {
      const functionMap: Record<keyof typeof SyncType, string> = {
        airlines: 'sync_airline_data',
        airports: 'sync_airport_data',
        routes: 'sync_route_data',
        petPolicies: 'analyze_pet_policies',
        countryPolicies: 'analyze_countries_policies'
      };

      const response = await supabase.functions.invoke(functionMap[type], {
        body: { 
          mode: clearData[type] ? 'clear' : mode,
          offset
        }
      });

      await handleSyncResponse(response, type, mode, offset);

    } catch (error: any) {
      console.error(`Error syncing ${type}:`, error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message || `Failed to sync ${type} data.`,
      });
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
