
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WandSparkles } from "lucide-react";

export const SyncSection = () => {
  const { toast } = useToast();
  const [countryInput, setCountryInput] = useState<string>("");
  const [forceContentComparison, setForceContentComparison] = useState<boolean>(false);
  const [smartUpdateBatchSize, setSmartUpdateBatchSize] = useState<number>(25);
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

  // Handle smart update for pet policies
  const handleSmartUpdate = () => {
    if (smartUpdateBatchSize <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Batch Size",
        description: "Please enter a positive number for the batch size.",
      });
      return;
    }
    
    handleSync('petPolicies', false, 'update', { 
      smartUpdate: true,
      compareContent: true, // Always enable content comparison for smart updates
      batchSize: smartUpdateBatchSize
    });
  };

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

      {/* Smart Update section for pet policies */}
      <div className="mb-8 border p-4 rounded-lg space-y-4">
        <h3 className="text-lg font-semibold">Smart Update Pet Policies</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-3">
            <div className="flex items-center gap-2">
              <span className="text-sm whitespace-nowrap">Batch Size:</span>
              <Input
                type="number"
                min="1"
                max="100"
                value={smartUpdateBatchSize}
                onChange={(e) => setSmartUpdateBatchSize(parseInt(e.target.value) || 25)}
                className="w-24"
              />
              <span className="text-xs text-muted-foreground">
                (Recommended: 25-50 airlines per batch)
              </span>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="border-dashed border-2 h-full"
            onClick={handleSmartUpdate}
            disabled={isInitializing.petPolicies}
          >
            <WandSparkles className="mr-2" />
            Run Smart Update
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Smart Update analyzes airline websites and prioritizes those with pet policies that need updating.
          The improved algorithm identifies specific pet policy URLs and ensures more accurate updates.
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
                handleSync(key as keyof typeof SyncType, resume, 'clear', { 
                  forceContentComparison,
                  compareContent: true  // Always enable content comparison
                });
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
