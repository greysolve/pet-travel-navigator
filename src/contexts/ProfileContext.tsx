
import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    let mounted = true;

    const handleAuthChange = async (event: string, session: any) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setError(null);
        return;
      }

      if (session?.user?.id) {
        await refreshProfile(session.user.id);
      }
    };

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id && mounted) {
        refreshProfile(session.user.id);
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
    if (retryCount >= 3) {
      console.log('Max retry attempts reached for profile refresh');
      setLoading(false);
      return;
    }

    console.log('Refreshing profile for user:', userId, 'attempt:', retryCount + 1);
    setLoading(true);
    setError(null);
    
    try {
      const profileData = await fetchProfile(userId);
      if (!profileData) {
        throw new ProfileError('Profile data is null', 'not_found');
      }
      console.log('Profile refreshed successfully:', profileData);
      setProfile(profileData);
      setError(null);
      setRetryCount(0);
    } catch (error) {
      console.error('Error refreshing profile:', error);
      if (error instanceof ProfileError) {
        setError(error);
        setProfile(null);
        
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
      setLoading(false);
      setInitialized(true);
    }
  };

  const handleProfileUpdate = async (updates: Partial<UserProfile>) => {
    if (!profile?.id) {
      console.error('Cannot update profile: No profile ID');
      return;
    }

    setLoading(true);
    try {
      const updatedProfile = await updateProfile(profile.id, updates);
      setProfile(updatedProfile);
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      
      if (profile) {
        setProfile(profile);
      }
      
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
