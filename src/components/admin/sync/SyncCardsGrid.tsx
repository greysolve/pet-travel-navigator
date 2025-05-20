
import { SyncCard } from "../sync-card";
import { SyncType } from "@/types/sync";
import { useToast } from "@/hooks/use-toast";

interface SyncCardsGridProps {
  clearData: Record<string, boolean>;
  setClearData: (value: React.SetStateAction<Record<string, boolean>>) => void;
  isInitializing: Record<string, boolean>;
  syncProgress: any;
  handleSync: (syncType: keyof typeof SyncType, resumeSync?: boolean, mode?: string) => void;
  handlePetPoliciesWebhook: () => void;
  countryInput: string;
}

export const SyncCardsGrid = ({ 
  clearData, 
  setClearData, 
  isInitializing, 
  syncProgress, 
  handleSync,
  handlePetPoliciesWebhook,
  countryInput
}: SyncCardsGridProps) => {
  const { toast } = useToast();

  return (
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
              // Always call webhook for pet policies, let the external process handle resuming
              handlePetPoliciesWebhook();
            } else {
              // For full sync or other types, no country validation needed
              handleSync(key as keyof typeof SyncType, resume, mode);
            }
          }}
          syncProgress={syncProgress?.[value]}
        />
      ))}
    </div>
  );
};
