
import React, { createContext, useContext, useState } from 'react';
import { UserProfile } from '@/types/auth';
import { ProfileError, fetchProfile, updateProfile } from '@/utils/profileManagement';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ProfileError | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const refreshProfile = async (userId: string) => {
    // Prevent retries if we've already tried 3 times
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
      console.log('Profile refreshed successfully:', profileData);
      setProfile(profileData);
      setError(null);
      // Reset retry count on success
      setRetryCount(0);
    } catch (error) {
      console.error('Error refreshing profile:', error);
      if (error instanceof ProfileError) {
        setError(error);
        setProfile(null);
        
        // Only show toast for network errors or after max retries
        if (error.type === 'network' || retryCount >= 2) {
          toast({
            title: "Profile Error",
            description: error.message,
            variant: "destructive",
          });
        }
        
        // Increment retry count only for network errors
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
      
      // Keep the original profile on error
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
