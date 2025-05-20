
import { useState } from 'react';
import { SyncType } from '@/types/sync';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Define the record structure for status tracking
type StatusRecord = Record<keyof typeof SyncType, boolean>;

export const useSyncInitialization = () => {
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState<StatusRecord>({} as StatusRecord);
  const [clearData, setClearData] = useState<StatusRecord>({} as StatusRecord);

  return {
    isInitializing,
    setIsInitializing,
    clearData,
    setClearData,
    toast
  };
};
