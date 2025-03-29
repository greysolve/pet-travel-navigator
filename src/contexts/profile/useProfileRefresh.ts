
import { useState, useRef } from 'react';
import { UserProfile } from '@/types/auth';
import { ProfileError, fetchProfile } from '@/utils/profile';
import { toast } from '@/components/ui/use-toast';

const MAX_RETRIES = 1; // Reduced retries to prevent excessive delays

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
  const currentRefreshUserId = useRef<string | null>(null);

  const refreshProfile = async (userId: string) => {
    // Prevent concurrent refreshes for the same user
    if (isRefreshing && currentRefreshUserId.current === userId) {
      console.log('ProfileRefresh: Already refreshing for this user, skipping');
      return;
    }

    console.log('ProfileRefresh: Starting profile refresh for user:', userId, {
      currentUserId: currentRefreshUserId.current,
      isRefreshing,
      retryCount: retryCount.current
    });

    // Reset retry count for new refreshes
    if (currentRefreshUserId.current !== userId) {
      retryCount.current = 0;
    }

    setIsRefreshing(true);
    setLoading(true);
    currentRefreshUserId.current = userId;
    
    while (retryCount.current <= MAX_RETRIES) {
      try {
        console.log(`ProfileRefresh: Attempt ${retryCount.current + 1}/${MAX_RETRIES + 1} to fetch profile`);
        
        const profileData = await fetchProfile(userId);
        
        if (currentRefreshUserId.current === userId) {
          console.log('ProfileRefresh: Successfully fetched profile:', profileData);
          setProfile(profileData);
          setError(null);
          setInitialized(true);
          setIsRefreshing(false);
          setLoading(false);
        }
        return;
      } catch (error) {
        console.error(`ProfileRefresh: Attempt ${retryCount.current + 1} failed:`, error);
        
        retryCount.current++;

        if (retryCount.current > MAX_RETRIES) {
          console.log('ProfileRefresh: Max retries reached');
          // Create a minimal fallback profile to allow the app to function
          if (currentRefreshUserId.current === userId) {
            setError(error instanceof ProfileError ? error : new ProfileError('Unknown error', 'unknown'));
            
            // Create an empty fallback profile with just the ID to allow basic functionality
            const fallbackProfile: UserProfile = {
              id: userId,
              userRole: 'pet_caddie', // Default role
              created_at: new Date().toISOString(),
              plan: 'free',
              search_count: 5
            };
            
            console.log('ProfileRefresh: Using fallback profile:', fallbackProfile);
            setProfile(fallbackProfile);
            setInitialized(true);
            
            toast({
              title: "Profile Issue",
              description: "There was a problem loading your complete profile. Some features may be limited.",
              variant: "destructive",
            });
            break;
          }
        }

        if (retryCount.current <= MAX_RETRIES) {
          const delay = Math.min(1000 * Math.pow(2, retryCount.current - 1), 4000);
          console.log(`ProfileRefresh: Waiting ${delay}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (currentRefreshUserId.current === userId) {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  return { refreshProfile, isRefreshing };
}
