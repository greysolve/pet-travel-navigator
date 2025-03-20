
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SyncType } from '@/types/sync';
import { useToast } from '@/hooks/use-toast';

// Define the record structure for status tracking
type StatusRecord = Record<keyof typeof SyncType, boolean>;

interface SyncOptions {
  forceContentComparison?: boolean;
  compareContent?: boolean;
  offset?: number;
  [key: string]: any;
}

export const useSyncOperations = () => {
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState<StatusRecord>({} as StatusRecord);
  const [clearData, setClearData] = useState<StatusRecord>({} as StatusRecord);

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
        try {
          const { data: syncProgress } = await supabase
            .from('sync_progress')
            .select('*')
            .eq('type', syncType)
            .single();
            
          if (syncProgress) {
            // Use the processed count as the next offset if it's greater than current
            if (syncProgress.processed > currentOffset) {
              console.log(`Updating offset from ${currentOffset} to ${syncProgress.processed} from sync progress`);
              currentOffset = syncProgress.processed;
            }
          }
        } catch (error) {
          console.log('Error fetching current sync progress, using provided offset', error);
        }
      }
      
      // Prepare endpoint and data based on sync type
      let endpoint = '';
      let data: any = {};
      
      switch (syncType) {
        case 'airlines':
          endpoint = 'sync_airline_data';
          data = { clear: clearData[syncType] };
          break;
        
        case 'airports':
          endpoint = 'sync_airport_data';
          data = { clear: clearData[syncType] };
          break;
          
        case 'routes':
          endpoint = 'sync_route_data';
          data = { clear: clearData[syncType] };
          break;
          
        case 'countryPolicies':
          endpoint = 'analyze_countries_policies';
          data = { 
            resumeSync, 
            mode, 
            countryName: mode !== 'clear' ? mode : undefined,
            offset: currentOffset
          };
          break;
          
        case 'petPolicies':
          endpoint = 'analyze_pet_policies';
          data = { 
            resumeSync, 
            mode: clearData[syncType] ? 'clear' : 'update',
            forceContentComparison: options.forceContentComparison || false,
            compareContent: options.compareContent || false,
            offset: currentOffset,
            limit: 10 // Process 10 airlines per batch
          };
          
          // Log the options for debugging
          console.log('Pet policy sync options:', data);
          break;
          
        default:
          throw new Error(`Unknown sync type: ${syncType}`);
      }
      
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
  }, [clearData, toast]);

  return {
    isInitializing,
    clearData,
    setClearData,
    handleSync
  };
};
