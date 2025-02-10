
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

      return data?.map(field => field.field_name) || [];
    },
    staleTime: 1000 * 60, // Consider data fresh for 1 minute
    cacheTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });
};
