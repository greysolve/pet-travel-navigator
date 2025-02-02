import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { SyncCard } from "./SyncCard";
import { SyncType, SyncProgress, SyncProgressRecord } from "@/types/sync";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface SyncProgressDB {
  id: string;
  type: string;
  total: number;
  processed: number;
  last_processed: string | null;
  processed_items: string[];
  error_items: string[];
  start_time: string | null;
  needs_continuation: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export const SyncSection = () => {
  const [isInitializing, setIsInitializing] = useState<{[key: string]: boolean}>({});
  const [clearData, setClearData] = useState<{[key in keyof typeof SyncType]: boolean}>({
    airlines: false,
    airports: false,
    petPolicies: false,
    routes: false,
    countryPolicies: false
  });
  const [testCountry, setTestCountry] = useState<string>("");
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

  useEffect(() => {
    console.log('Setting up sync progress subscription');
    const channel = supabase
      .channel('sync_progress_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_progress'
        },
        async (payload: RealtimePostgresChangesPayload<SyncProgressDB>) => {
          console.log('Received sync progress update:', payload);
          const newRecord = payload.new as SyncProgressDB;
          
          if (newRecord) {
            console.log(`Processing sync progress update for ${newRecord.type}:`, newRecord);
            
            // Update the query cache with the new progress
            queryClient.setQueryData<SyncProgressRecord>(
              ["syncProgress"],
              (oldData) => ({
                ...(oldData || {}),
                [newRecord.type]: {
                  total: newRecord.total,
                  processed: newRecord.processed,
                  lastProcessed: newRecord.last_processed,
                  processedItems: newRecord.processed_items || [],
                  errorItems: newRecord.error_items || [],
                  startTime: newRecord.start_time,
                  isComplete: !newRecord.needs_continuation
                }
              })
            );

            // If sync failed, show error toast
            if (newRecord.error_items?.length > 0) {
              const lastError = newRecord.error_items[newRecord.error_items.length - 1];
              toast({
                variant: "destructive",
                title: "Sync Error",
                description: `Error during ${newRecord.type} sync: ${lastError}`,
              });
            }

            // If sync completed successfully, show success toast
            if (!newRecord.needs_continuation && payload.eventType === 'UPDATE') {
              toast({
                title: "Sync Complete",
                description: `Successfully synchronized ${newRecord.type} data.`,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up sync progress subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: syncProgress } = useQuery({
    queryKey: ["syncProgress"],
    queryFn: async () => {
      console.log('Fetching initial sync progress...');
      const { data, error } = await supabase
        .from('sync_progress')
        .select('*');

      if (error) {
        console.error('Error fetching sync progress:', error);
        throw error;
      }

      console.log('Raw sync progress data:', data);

      const progressRecord = (data as SyncProgressDB[]).reduce((acc: SyncProgressRecord, curr) => {
        acc[curr.type as keyof typeof SyncType] = {
          total: curr.total,
          processed: curr.processed,
          lastProcessed: curr.last_processed,
          processedItems: curr.processed_items || [],
          errorItems: curr.error_items || [],
          startTime: curr.start_time,
          isComplete: !curr.needs_continuation
        };
        return acc;
      }, {});

      console.log('Processed sync progress data:', progressRecord);
      return progressRecord;
    },
  });

  const handleSync = async (type: keyof typeof SyncType, resume: boolean = false) => {
    console.log(`Starting sync for ${type}, resume: ${resume}`);
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

      const functionName = functionMap[type];
      if (!functionName) {
        throw new Error(`Unknown sync type: ${type}`);
      }

      console.log(`Invoking edge function ${functionName}`);
      const { error } = await supabase.functions.invoke(functionName, {
        body: testCountry && type === 'countryPolicies' ? { testCountry } : undefined
      });

      if (error) throw error;

      if (!resume) {
        toast({
          title: "Sync Started",
          description: `Started synchronizing ${type} data${testCountry ? ` for ${testCountry}` : ''}.`,
        });
      }
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

  return (
    <div className="space-y-8">
      {Object.entries(syncProgress || {}).some(([_, progress]: [string, SyncProgress]) => 
        progress && !progress.isComplete && progress.processed < progress.total
      ) && (
        <div className="bg-accent/20 p-4 rounded-lg mb-8">
          <h3 className="text-lg font-semibold mb-2">Active Syncs</h3>
          <div className="space-y-2">
            {Object.entries(syncProgress || {}).map(([type, progress]: [string, SyncProgress]) => 
              progress && !progress.isComplete && progress.processed < progress.total && (
                <div key={type} className="text-sm">
                  {type}: {progress.processed} of {progress.total} items processed
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Add test country input for country policies */}
      <div className="mb-8">
        <div className="flex gap-4 items-center">
          <input
            type="text"
            placeholder="Test country (e.g., Switzerland)"
            value={testCountry}
            onChange={(e) => setTestCountry(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {testCountry && (
            <button
              onClick={() => setTestCountry("")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Optional: Enter a country name to test country policies sync for a single country
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {Object.entries(SyncType).map(([key, value]) => (
          <SyncCard
            key={key}
            title={`${key.replace(/([A-Z])/g, ' $1').trim()} Synchronization`}
            clearData={clearData[key as keyof typeof SyncType]}
            onClearDataChange={(checked) => {
              setClearData(prev => ({ ...prev, [key]: checked }));
            }}
            isLoading={isInitializing[value]}
            onSync={(resume) => handleSync(key as keyof typeof SyncType, resume)}
            syncProgress={syncProgress?.[value]}
          />
        ))}
      </div>
    </div>
  );
};

export default SyncSection;