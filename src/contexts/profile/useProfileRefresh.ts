
import { useState, useRef } from 'react';
import { UserProfile } from '@/types/auth';
import { ProfileError, fetchProfile } from '@/utils/profileManagement';
import { toast } from '@/components/ui/use-toast';

const MAX_RETRIES = 2;

export interface ProfileRefreshResult {
  refreshProfile: (userId: string) => Promise<void>;
  isRefreshing: boolean;
}

export function useProfileRefresh(
  setProfile: (profile: UserProfile | null) => void,
  setError: (error: ProfileError | null) => void,
  setLoading: (loading: boolean) => void,
  setInitialized: (initialized: boolean) => void
): ProfileRefreshResult {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const retryCount = useRef(0);
  const currentUserId = useRef<string | null>(null);

  const refreshProfile = async (userId: string) => {
    if (isRefreshing && currentUserId.current === userId) {
      console.log('Skipping profile refresh - already refreshing for this user');
      return;
    }

    console.log('Starting profile refresh for user:', userId, {
      currentUserId: currentUserId.current,
      isRefreshing,
      hasProfile: false,
      retryCount: retryCount.current
    });

    if (!isRefreshing) {
      retryCount.current = 0;
    }

    setIsRefreshing(true);
    setLoading(true);
    
    const existingProfile = null;

    while (retryCount.current <= MAX_RETRIES) {
      try {
        console.log(`Attempt ${retryCount.current + 1}/${MAX_RETRIES + 1} to fetch profile`);
        const profileData = await fetchProfile(userId);
        
        console.log('ProfileContext - Starting profile refresh with data:', profileData);
        
        if (currentUserId.current === userId) {
          console.log('ProfileContext - Setting profile state:', profileData);
          setProfile(profileData);
          setError(null);
          setInitialized(true);
          setIsRefreshing(false);
          setLoading(false);
        }
        return;
      } catch (error) {
        console.error(`Profile refresh attempt ${retryCount.current + 1} failed:`, error);
        
        if (!(error instanceof ProfileError)) {
          console.error('Unexpected error type:', error);
          setError(new ProfileError('Unexpected error occurred', 'unknown'));
          break;
        }

        retryCount.current++;

        if (retryCount.current > MAX_RETRIES) {
          console.log('Max retries reached, keeping existing profile if available');
          if (existingProfile && currentUserId.current === userId) {
            setProfile(existingProfile);
            setError(error);
            setInitialized(true);
            toast({
              title: "Profile Error",
              description: "There was a problem refreshing your profile. Please try again later.",
              variant: "destructive",
            });
          }
          break;
        }

        const delay = Math.min(1000 * Math.pow(2, retryCount.current), 8000);
        console.log(`Waiting ${delay}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (currentUserId.current === userId) {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  return { refreshProfile, isRefreshing };
}
