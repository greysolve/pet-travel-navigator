
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePremiumFields = () => {
  return useQuery({
    queryKey: ['premiumFields'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premium_field_settings')
        .select('field_name')
        .eq('is_premium', true);

      if (error) {
        console.error('[usePremiumFields] Error fetching premium fields:', error);
        throw error;
      }

      const fieldNames = data?.map(field => field.field_name) || [];
      console.log('[usePremiumFields] Fetched premium fields:', fieldNames);
      
      return fieldNames;
    },
    staleTime: 1000 * 30, // Check for updates every 30 seconds
    gcTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 30000),
  });
};
