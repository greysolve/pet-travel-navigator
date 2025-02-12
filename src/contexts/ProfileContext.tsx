
import React, { createContext, useContext, useState } from 'react';
import { UserProfile } from '@/types/auth';
import { ProfileError, fetchProfile } from '@/utils/profileManagement';
import { toast } from '@/components/ui/use-toast';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ProfileError | null>(null);
  const [initialized, setInitialized] = useState(false);

  const refreshProfile = async (userId: string) => {
    console.log('Refreshing profile for user:', userId);
    setLoading(true);
    setError(null);
    
    try {
      const profileData = await fetchProfile(userId);
      console.log('Profile refreshed successfully:', profileData);
      setProfile(profileData);
    } catch (error) {
      console.error('Error refreshing profile:', error);
      if (error instanceof ProfileError) {
        setError(error);
        toast({
          title: "Profile Error",
          description: "There was a problem loading your profile. Please try again.",
          variant: "destructive",
        });
      }
      setProfile(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile?.id) {
      console.error('Cannot update profile: No profile ID');
      return;
    }

    setLoading(true);
    try {
      // For now, we'll just update the local state
      // In the next steps, we'll implement the actual update logic
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
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
        updateProfile,
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
