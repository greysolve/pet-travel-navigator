
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
  const currentUserId = useRef<string | null>(null);
  const isRefreshing = useRef(false);

  useEffect(() => {
    let mounted = true;

    const handleAuthChange = async (event: string, session: any) => {
      if (!mounted) return;

      console.log('Auth state changed:', { event, userId: session?.user?.id });

      if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing profile state');
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
    // Only skip if we're already refreshing for the same user
    if (isRefreshing.current && currentUserId.current === userId) {
      console.log('Skipping profile refresh - already refreshing for this user');
      return;
    }

    console.log('Starting profile refresh for user:', userId, {
      currentUserId: currentUserId.current,
      isRefreshing: isRefreshing.current,
      initialized,
      hasProfile: !!profile
    });

    isRefreshing.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const profileData = await fetchProfile(userId);
      
      // Only update state if the user hasn't changed
      if (currentUserId.current === userId) {
        console.log('Profile refreshed successfully:', profileData);
        setProfile(profileData);
        setError(null);
        setInitialized(true);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      
      if (error instanceof ProfileError && currentUserId.current === userId) {
        if (error.type === 'not_found') {
          // Clear everything like sign out for auth errors
          console.log('Auth error detected, clearing profile state');
          currentUserId.current = null;
          setProfile(null);
          setError(null);
          setInitialized(false);
        } else {
          // For other errors, set error state but maintain profile if we have it
          setError(error);
          toast({
            title: "Profile Error",
            description: "There was a problem loading your profile. Please try again later.",
            variant: "destructive",
          });
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
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again later.",
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
