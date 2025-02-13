
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserProfile } from '@/types/auth';
import { ProfileError, fetchProfile, updateProfile } from '@/utils/profileManagement';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  error: ProfileError | null;
  initialized: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: (userId: string) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ProfileError | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const currentUserId = useRef<string | null>(null);
  const isRefreshing = useRef(false);

  useEffect(() => {
    let mounted = true;

    const handleAuthChange = async (event: string, session: any) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        currentUserId.current = null;
        setProfile(null);
        setError(null);
        setLoading(false);
        setInitialized(false);
        return;
      }

      const userId = session?.user?.id;
      if (userId && userId !== currentUserId.current) {
        currentUserId.current = userId;
        await refreshProfile(userId);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      const userId = session?.user?.id;
      if (userId) {
        currentUserId.current = userId;
        refreshProfile(userId);
      } else {
        setLoading(false);
        setInitialized(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async (userId: string) => {
    if (isRefreshing.current || (profile?.id === userId && !error)) {
      console.log('Skipping profile refresh - already refreshing or profile already loaded');
      return;
    }

    if (retryCount >= 3) {
      console.log('Max retry attempts reached for profile refresh');
      setLoading(false);
      setInitialized(false);
      return;
    }

    console.log('Refreshing profile for user:', userId, 'attempt:', retryCount + 1);
    isRefreshing.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const profileData = await fetchProfile(userId);
      if (!profileData) {
        throw new ProfileError('Profile data is null', 'not_found');
      }
      
      // Only update state if the user hasn't changed
      if (currentUserId.current === userId) {
        console.log('Profile refreshed successfully:', profileData);
        setProfile(profileData);
        setError(null);
        setRetryCount(0);
        setInitialized(true); // Only set initialized on success
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      if (error instanceof ProfileError && currentUserId.current === userId) {
        setError(error);
        setProfile(null);
        setInitialized(false); // Ensure initialized is false on error
        
        if (error.type === 'network' || retryCount >= 2) {
          toast({
            title: "Profile Error",
            description: error.message,
            variant: "destructive",
          });
        }
        
        if (error.type === 'network') {
          setRetryCount(prev => prev + 1);
        }
      }
    } finally {
      isRefreshing.current = false;
      if (currentUserId.current === userId) {
        setLoading(false);
      }
    }
  };

  const handleProfileUpdate = async (updates: Partial<UserProfile>) => {
    if (!profile?.id) {
      console.error('Cannot update profile: No profile ID');
      return;
    }

    console.log('ProfileContext - Starting profile update:', {
      profileId: profile?.id,
      updates: updates
    });

    setLoading(true);
    try {
      const updatedProfile = await updateProfile(profile.id, updates);
      if (currentUserId.current === profile.id) {
        console.log('ProfileContext - Profile updated successfully:', updatedProfile);
        setProfile(updatedProfile);
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      }
    } catch (error) {
      console.error('ProfileContext - Error updating profile:', error);
      
      if (profile && currentUserId.current === profile.id) {
        setProfile(profile);
        toast({
          title: "Error",
          description: "Failed to update profile",
          variant: "destructive",
        });
      }
    } finally {
      if (currentUserId.current === profile.id) {
        setLoading(false);
      }
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        error,
        initialized,
        updateProfile: handleProfileUpdate,
        refreshProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
