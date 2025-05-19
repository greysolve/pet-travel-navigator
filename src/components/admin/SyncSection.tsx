
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SyncType } from "@/types/sync";
import { ActiveSyncs } from "./sync/ActiveSyncs";
import { useSyncOperations } from "./hooks/useSyncOperations";
import { useSyncProgressSubscription } from "./hooks/useSyncProgressSubscription";
import { SyncProgressDB } from "./types/sync-types";
import { CountryInputSection } from "./sync/CountryInputSection";
import { SmartUpdateSection } from "./sync/SmartUpdateSection";
import { SyncCardsGrid } from "./sync/SyncCardsGrid";
import { useWebhookHandler } from "./sync/useWebhookHandler";

export const SyncSection = () => {
  const [countryInput, setCountryInput] = useState<string>("");
  const { isInitializing, clearData, setClearData, handleSync } = useSyncOperations();
  const { isWebhookLoading, handlePetPoliciesWebhook } = useWebhookHandler();
  
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

  // Handle smart update for pet policies
  const handleSmartUpdate = (batchSize: number) => {
    handleSync('petPolicies', false, 'update', { 
      smartUpdate: true,
      batchSize: batchSize
    });
  };

  // Combine isInitializing with webhook loading state
  const combinedLoadingState = {
    ...isInitializing,
    petPolicies: isInitializing.petPolicies || isWebhookLoading
  };

  return (
    <div className="space-y-8">
      <ActiveSyncs syncProgress={syncProgress || {}} />

      {/* Country input for country policies */}
      <CountryInputSection 
        initialValue={countryInput}
        onChange={setCountryInput}
      />

      {/* Smart Update section for pet policies */}
      <SmartUpdateSection 
        onSmartUpdate={handleSmartUpdate}
        isLoading={combinedLoadingState.petPolicies}
      />

      {/* Sync cards grid */}
      <SyncCardsGrid 
        clearData={clearData}
        setClearData={setClearData}
        isInitializing={combinedLoadingState}
        syncProgress={syncProgress}
        handleSync={handleSync}
        handlePetPoliciesWebhook={() => handlePetPoliciesWebhook(clearData.petPolicies)}
        countryInput={countryInput}
      />
    </div>
  );
};

export default SyncSection;
