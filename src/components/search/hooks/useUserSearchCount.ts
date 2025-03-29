
import { useUser } from '@/contexts/user/UserContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

/**
 * Hook to fetch and manage the user's search count
 * This handles both authenticated and unauthenticated states properly
 * Prioritizes profile data over database queries to reduce latency
 */
export function useUserSearchCount() {
  const { user, profile, profileInitialized } = useUser();
  const queryClient = useQueryClient();

  // Reset the search count query when auth state changes
  useEffect(() => {
    if (user?.id && profileInitialized) {
      // Invalidate the search count query when profile is initialized
      // This ensures we use fresh data after login/logout
      queryClient.invalidateQueries({ queryKey: ['searchCount', user.id] });
    } else if (!user) {
      // Clear search count cache when user logs out
      queryClient.removeQueries({ queryKey: ['searchCount'] });
    }
  }, [user?.id, profileInitialized, queryClient]);

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

      // If we already have search_count in the profile, use it to avoid an extra query
      if (profile?.search_count !== undefined) {
        console.log('UserSearchCount: Using search count from profile:', profile.search_count);
        return profile.search_count;
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

      console.log('UserSearchCount: Received count from DB:', data?.search_count);
      return data?.search_count ?? 0;
    },
    enabled: !!user?.id, // Only run query when we have a user ID
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Check if user is an admin directly from the profile
  const isAdmin = profile?.userRole === 'site_manager';
  
  // Improved fallback logic with consistent default values
  const searchCount = isAdmin 
    ? -1 // Admins have unlimited searches
    : searchCountQuery.data !== null && searchCountQuery.data !== undefined
      ? searchCountQuery.data 
      : profile?.search_count !== undefined
        ? profile.search_count
        : 0;

  return {
    searchCount,
    isLoading: searchCountQuery.isLoading && !!user && !isAdmin,
    isPlanReady: !!profile?.plan,
    error: searchCountQuery.error,
    isUnlimited: isAdmin || (searchCount === -1),
  };
}
