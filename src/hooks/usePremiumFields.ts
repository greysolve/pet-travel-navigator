
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

      // Log the premium fields being fetched
      console.log('Fetched premium fields:', data?.map(field => field.field_name));
      return data?.map(field => field.field_name) || [];
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });
};
