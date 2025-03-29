
import { useUser } from '@/contexts/user/UserContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to fetch and manage the user's search count
 * This handles both authenticated and unauthenticated states properly
 */
export function useUserSearchCount() {
  const { user, profile, profileInitialized, lifecycleState } = useUser();

  const searchCountQuery = useQuery({
    queryKey: ['searchCount', user?.id, profileInitialized, lifecycleState],
    queryFn: async () => {
      // Don't fetch if profile isn't initialized yet
      if (!user?.id || !profileInitialized) {
        console.log('UserSearchCount: Waiting for profile initialization', { 
          userId: user?.id, 
          profileInitialized,
          lifecycleState
        });
        return null;
      }

      // Admin users always have unlimited searches, represented as -1
      if (profile?.userRole === 'site_manager') {
        console.log('UserSearchCount: User is an admin, returning unlimited searches');
        return -1; // Special value to indicate unlimited searches
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
    enabled: !!user?.id && profileInitialized, // Only run query when profile is initialized
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: false,
    // Add staleTime to prevent unnecessary refetches
    staleTime: 30000, // 30 seconds
  });

  // Check if user is an admin directly from the profile
  const isAdmin = profile?.userRole === 'site_manager';
  
  // If profile isn't initialized yet, return loading state
  if (!profileInitialized && user) {
    return {
      searchCount: null,
      isLoading: true,
      isPlanReady: false,
      error: null,
      isUnlimited: false,
    };
  }
  
  return {
    searchCount: isAdmin ? -1 : (searchCountQuery.data ?? profile?.search_count ?? 0),
    isLoading: searchCountQuery.isLoading,
    isPlanReady: !!profile?.plan,
    error: searchCountQuery.error,
    isUnlimited: isAdmin || (searchCountQuery.data === -1),
  };
}
