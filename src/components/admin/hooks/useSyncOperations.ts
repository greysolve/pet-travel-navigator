
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SyncType } from '@/types/sync';
import { useSyncInitialization } from './useSyncInitialization';
import { getCurrentSyncProgress } from '../utils/syncProgressUtils';
import { getSyncEndpointAndData } from '../utils/syncEndpoints';
import { useSmartUpdate } from './useSmartUpdate';

interface SyncOptions {
  offset?: number;
  smartUpdate?: boolean;
  batchSize?: number;
  [key: string]: any;
}

export const useSyncOperations = () => {
  const { isInitializing, setIsInitializing, clearData, setClearData, toast } = useSyncInitialization();
  const { getAirlinesNeedingUpdate } = useSmartUpdate();

  // Initialize the sync operation with the backend
  const handleSync = useCallback(async (
    syncType: keyof typeof SyncType, 
    resumeSync: boolean = false, 
    mode: string = 'clear',
    options: SyncOptions = {}
  ) => {
    setIsInitializing(prev => ({ ...prev, [syncType]: true }));
    
    try {
      console.log(`Starting ${syncType} sync...`, { resumeSync, mode, options });
      
      // Get current sync progress if resuming
      let currentOffset = options.offset || 0;
      
      if (resumeSync) {
        const syncProgress = await getCurrentSyncProgress(syncType);
        if (syncProgress && syncProgress.processed > currentOffset) {
          console.log(`Updating offset from ${currentOffset} to ${syncProgress.processed} from sync progress`);
          currentOffset = syncProgress.processed;
        }
      }
      
      // Smart Update mode - only for pet policies
      let specificAirlines: string[] | undefined = undefined;
      
      if (syncType === 'petPolicies' && options.smartUpdate) {
        console.log('Smart Update mode enabled - fetching airlines that need updates');
        specificAirlines = await getAirlinesNeedingUpdate();
        
        if (!specificAirlines) {
          setIsInitializing(prev => ({ ...prev, [syncType]: false }));
          return;
        }
        
        const batchSize = options.batchSize || 25; // Default to 25 if not specified
        console.log(`Found ${specificAirlines.length} airlines that need updates`);
        
        // If we have a lot of airlines, warn the user but proceed with the first batch
        if (specificAirlines.length > batchSize) {
          toast({
            title: "Smart Update - Large Batch",
            description: `Found ${specificAirlines.length} airlines needing updates. Processing the first ${batchSize} now.`,
          });
          
          // Take only the first batch based on batchSize
          specificAirlines = specificAirlines.slice(0, batchSize);
        }
      }
      
      // Prepare endpoint and data based on sync type
      const { endpoint, data } = getSyncEndpointAndData(
        syncType, 
        clearData[syncType], 
        resumeSync, 
        mode, 
        currentOffset, 
        {
          ...options,
          airlines: specificAirlines
        }
      );
      
      console.log('Pet policy sync options:', data);
      
      // Use supabase.functions.invoke instead of direct fetch
      const { data: result, error } = await supabase.functions.invoke(endpoint, {
        method: 'POST',
        body: data
      });
      
      if (error) {
        throw new Error(`Failed to start sync: ${error.message}`);
      }
      
      console.log(`${syncType} sync initiated:`, result);
      
      // Only show toast for initial sync start, not continuations
      if (!resumeSync) {
        toast({
          title: "Sync Started",
          description: `${syncType} synchronization has been initiated.`,
        });
      }
      
    } catch (error) {
      console.error(`Error starting ${syncType} sync:`, error);
      toast({
        variant: "destructive",
        title: "Sync Error",
        description: error instanceof Error ? error.message : "Failed to start sync",
      });
    } finally {
      setIsInitializing(prev => ({ ...prev, [syncType]: false }));
    }
  }, [clearData, toast, setIsInitializing, getAirlinesNeedingUpdate]);

  return {
    isInitializing,
    clearData,
    setClearData,
    handleSync
  };
};
