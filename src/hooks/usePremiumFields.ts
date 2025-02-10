
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
        console.error('Error fetching premium fields:', error);
        throw error;
      }

      const fieldNames = data?.map(field => field.field_name) || [];
      console.log('[usePremiumFields] Raw data from premium_field_settings:', data);
      console.log('[usePremiumFields] Mapped premium field names:', fieldNames);
      
      return fieldNames;
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  });
};
