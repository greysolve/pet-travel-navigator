
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SyncType } from '@/types/sync';
import { useToast } from '@/hooks/use-toast';

// Define the record structure for status tracking
type StatusRecord = Record<keyof typeof SyncType, boolean>;

interface SyncOptions {
  offset?: number;
  smartUpdate?: boolean;
  batchSize?: number;
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
      
      // Smart Update mode - only for pet policies
      let specificAirlines: string[] | undefined = undefined;
      
      if (syncType === 'petPolicies' && options.smartUpdate) {
        console.log('Smart Update mode enabled - fetching airlines that need updates');
        try {
          // Use the updated database function
          const { data, error } = await supabase.rpc('get_airlines_needing_policy_update');
          
          if (error) {
            throw new Error(`Failed to get airlines needing updates: ${error.message}`);
          }
          
          if (data && Array.isArray(data) && data.length > 0) {
            // The function returns objects with an id field (text type)
            specificAirlines = data.map(item => item.id);
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
          } else {
            toast({
              title: "No Updates Needed",
              description: "No airlines were found that need policy updates at this time.",
            });
            setIsInitializing(prev => ({ ...prev, [syncType]: false }));
            return;
          }
        } catch (error) {
          console.error('Error getting airlines needing updates:', error);
          toast({
            variant: "destructive",
            title: "Smart Update Error",
            description: error instanceof Error ? error.message : "Failed to get airlines needing updates",
          });
          setIsInitializing(prev => ({ ...prev, [syncType]: false }));
          return;
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
            offset: currentOffset,
            limit: options.batchSize || 10, // Use provided batchSize or default to 10
            airlines: specificAirlines // Pass specific airlines for smart update
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
