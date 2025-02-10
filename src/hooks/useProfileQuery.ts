
import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "@/utils/profileManagement";
import { UserProfile } from "@/types/auth";

export const useProfileQuery = (userId: string | undefined) => {
  return useQuery<UserProfile>({
    queryKey: ['profile', userId],
    queryFn: () => {
      if (!userId) throw new Error('No user ID provided');
      return fetchProfile(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    cacheTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
