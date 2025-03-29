
import { useUser } from '@/contexts/user/UserContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to fetch and manage the user's search count
 * This handles both authenticated and unauthenticated states properly
 */
export function useUserSearchCount() {
  const { user, profile } = useUser();

  const searchCountQuery = useQuery({
    queryKey: ['searchCount', user?.id],
    queryFn: async () => {
      // Don't fetch if no user
      if (!user?.id) {
        console.log('UserSearchCount: No user ID, returning null');
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
    enabled: !!user?.id, // Only run query when we have a user ID
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: false,
    // Add staleTime to prevent unnecessary refetches
    staleTime: 30000, // 30 seconds
  });

  // Check if user is an admin directly from the profile
  const isAdmin = profile?.userRole === 'site_manager';
  
  // Implement fallback logic for search count
  const searchCount = isAdmin 
    ? -1 // Admins have unlimited searches
    : searchCountQuery.data ?? profile?.search_count ?? 0;

  return {
    searchCount,
    isLoading: searchCountQuery.isLoading && !!user,
    isPlanReady: !!profile?.plan,
    error: searchCountQuery.error,
    isUnlimited: isAdmin || (searchCountQuery.data === -1),
  };
}
