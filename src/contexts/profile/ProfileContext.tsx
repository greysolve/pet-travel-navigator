
import React, { createContext, useContext } from 'react';
import { useUser } from '../user/UserContext';
import { UserProfile } from '@/utils/profile/types';
import { ProfileError } from '@/utils/profile/ProfileError';

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  error: ProfileError | null;
  initialized: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileProviderProps {
  children: React.ReactNode;
}

export function ProfileProvider({ children }: ProfileProviderProps) {
  const { 
    profile, 
    profileLoading, 
    profileError, 
    profileInitialized,
    updateProfile,
    refreshProfile,
    lifecycleState
  } = useUser();

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading: profileLoading,
        error: profileError,
        initialized: profileInitialized,
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
