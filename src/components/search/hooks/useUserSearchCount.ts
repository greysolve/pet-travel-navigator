
import { useUser } from '@/contexts/user/UserContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to fetch and manage the user's search count
 * This handles both authenticated and unauthenticated states properly
 */
export function useUserSearchCount() {
  const { user, profile, profileInitialized } = useUser();

  const searchCountQuery = useQuery({
    queryKey: ['searchCount', user?.id],
    queryFn: async () => {
      // If no user or plan isn't initialized yet, don't fetch search count
      if (!user?.id || !profileInitialized) {
        console.log('UserSearchCount: No user ID or profile not initialized', { 
          userId: user?.id, 
          profileInitialized 
        });
        return null;
      }

      console.log('UserSearchCount: Fetching search count for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('search_count')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching search count:', error);
        return null;
      }

      console.log('UserSearchCount: Received count:', data?.search_count);
      return data?.search_count ?? 0;
    },
    enabled: !!user?.id && profileInitialized,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Return search count from profile if available (as a fallback)
  // and also include whether we're still loading profile data
  return {
    searchCount: searchCountQuery.data ?? profile?.search_count ?? 0,
    isLoading: searchCountQuery.isLoading,
    isPlanReady: !!profile?.plan,
    error: searchCountQuery.error,
  };
}
