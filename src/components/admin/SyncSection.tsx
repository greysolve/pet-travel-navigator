
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SyncCard } from "./SyncCard";
import { SyncType } from "@/types/sync";
import { ActiveSyncs } from "./sync/ActiveSyncs";
import { useSyncOperations } from "./hooks/useSyncOperations";
import { useSyncProgressSubscription } from "./hooks/useSyncProgressSubscription";
import { SyncProgressDB } from "./types/sync-types";
import { useToast } from "@/hooks/use-toast";

export const SyncSection = () => {
  const { toast } = useToast();
  const [countryInput, setCountryInput] = useState<string>("");
  const [forceContentComparison, setForceContentComparison] = useState<boolean>(false);
  const { isInitializing, clearData, setClearData, handleSync } = useSyncOperations();
  
  // Set up sync progress subscription
  useSyncProgressSubscription();

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

      const progressRecord = (data as SyncProgressDB[]).reduce((acc, curr) => {
        acc[curr.type as keyof typeof SyncType] = {
          total: curr.total,
          processed: curr.processed,
          lastProcessed: curr.last_processed,
          processedItems: curr.processed_items || [],
          errorItems: curr.error_items || [],
          startTime: curr.start_time,
          isComplete: curr.is_complete,
          needsContinuation: curr.needs_continuation
        };
        return acc;
      }, {} as any);

      // Set country input if there's an incomplete country policy sync
      const countrySync = progressRecord.countryPolicies;
      if (countrySync && 
          !countrySync.isComplete && 
          countrySync.lastProcessed && 
          countrySync.lastProcessed !== 'clear' &&
          countrySync.needsContinuation) {
        console.log('Setting country input from incomplete sync:', countrySync.lastProcessed);
        setCountryInput(countrySync.lastProcessed);
      }

      console.log('Processed sync progress data:', progressRecord);
      return progressRecord;
    },
  });

  return (
    <div className="space-y-8">
      <ActiveSyncs syncProgress={syncProgress || {}} />

      {/* Country input for country policies */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Enter country name for single country sync"
          value={countryInput}
          onChange={(e) => setCountryInput(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
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
            showForceContentComparison={key === 'petPolicies'}
            forceContentComparison={key === 'petPolicies' ? forceContentComparison : false}
            onForceContentComparisonChange={
              key === 'petPolicies' 
                ? (checked) => setForceContentComparison(checked)
                : undefined
            }
            onSync={(resume, mode) => {
              if (key === 'countryPolicies' && mode !== 'clear') {
                // Only validate country input for single country sync
                const trimmedCountry = countryInput.trim();
                if (!trimmedCountry) {
                  toast({
                    variant: "destructive",
                    title: "Country Required",
                    description: "Please enter a valid country name for single country sync.",
                  });
                  return;
                }
                handleSync(key as keyof typeof SyncType, resume, trimmedCountry);
              } else if (key === 'petPolicies') {
                // Pass the forceContentComparison flag for pet policies
                handleSync(key as keyof typeof SyncType, resume, 'clear', { forceContentComparison });
              } else {
                // For full sync or other types, no country validation needed
                handleSync(key as keyof typeof SyncType, resume, mode);
              }
            }}
            syncProgress={syncProgress?.[value]}
          />
        ))}
      </div>
    </div>
  );
};

export default SyncSection;
