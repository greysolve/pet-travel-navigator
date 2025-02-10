
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fetchSearchCount = async (userId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('search_count')
    .eq('id', userId)
    .single();
    
  if (error) throw error;
  return data?.search_count ?? 0;
};

export const useSearchCountQuery = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['searchCount', userId],
    queryFn: () => {
      if (!userId) throw new Error('No user ID provided');
      return fetchSearchCount(userId);
    },
    enabled: !!userId,
    staleTime: 0, // Always fetch fresh search count
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });
};
