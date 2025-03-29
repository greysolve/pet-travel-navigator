
import React, { createContext, useContext, useState, useRef } from 'react';
import { UserProfile } from '@/types/auth';
import { ProfileError } from '@/utils/profileManagement';
import { useProfileRefresh } from './useProfileRefresh';
import { useProfileUpdater } from './useProfileUpdater';
import { useProfileInitializer } from './useProfileInitializer';
import { initialProfileState } from './ProfileState';

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  error: ProfileError | null;
  initialized: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: (userId: string) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileProviderProps {
  children: React.ReactNode;
}

export function ProfileProvider({ children }: ProfileProviderProps) {
  const [profile, setProfile] = useState<UserProfile | null>(initialProfileState.profile);
  const [loading, setLoading] = useState(initialProfileState.loading);
  const [error, setError] = useState<ProfileError | null>(initialProfileState.error);
  const [initialized, setInitialized] = useState(initialProfileState.initialized);
  const currentUserId = useRef<string | null>(null);

  // Handle profile refreshing
  const { refreshProfile, isRefreshing } = useProfileRefresh(
    setProfile,
    setError,
    setLoading,
    setInitialized
  );

  // Handle profile updating
  const { updateUserProfile } = useProfileUpdater(
    setProfile,
    setLoading,
    setInitialized,
    currentUserId
  );

  // Handle auth state changes and session restoration
  const handleAuthChange = async (userId: string | null) => {
    if (userId === null) {
      // User signed out
      currentUserId.current = null;
      setProfile(null);
      setError(null);
      setLoading(false);
      setInitialized(true);
      return;
    }

    if (userId !== currentUserId.current) {
      currentUserId.current = userId;
      await refreshProfile(userId);
    }
  };

  const { isRestoring } = useProfileInitializer(handleAuthChange);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading: loading || isRestoring,
        error,
        initialized: initialized && !isRestoring,
        updateProfile: updateUserProfile,
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
