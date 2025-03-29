
import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { UserProfile } from '@/types/auth';
import { ProfileError } from '@/utils/profile/ProfileError';
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
  const initAttempts = useRef(0);

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

  // Define a clear callback for auth state changes
  const handleAuthChange = useCallback(async (userId: string | null) => {
    console.log('ProfileContext: Auth state changed, userId:', userId, 'current:', currentUserId.current);
    
    if (userId === null) {
      // User signed out
      console.log('ProfileContext: User signed out, clearing profile state');
      currentUserId.current = null;
      setProfile(null);
      setError(null);
      setLoading(false);
      setInitialized(true);
      return;
    }

    // If userId is the same, don't reload profile to avoid loops
    if (userId === currentUserId.current && profile) {
      console.log('ProfileContext: User ID unchanged and profile exists, skipping refresh');
      return;
    }

    // Set the loading state
    setLoading(true);
    initAttempts.current++;
    currentUserId.current = userId;
    
    try {
      console.log('ProfileContext: Loading profile for user:', userId, '(attempt', initAttempts.current, ')');
      await refreshProfile(userId);
    } catch (err) {
      console.error('ProfileContext: Error in auth change handler:', err);
      
      // After multiple failed attempts, show error but let the app continue
      if (initAttempts.current >= 3) {
        setLoading(false);
        setInitialized(true);
      }
    }
  }, [refreshProfile, profile]);

  // Use the profile initializer to handle auth state changes
  const { isRestoring } = useProfileInitializer(handleAuthChange);

  const contextValue = {
    profile,
    loading: loading || isRestoring,
    error,
    initialized: initialized && !isRestoring,
    updateProfile: updateUserProfile,
    refreshProfile,
  };

  console.log('ProfileContext rendering with state:', {
    loading: contextValue.loading,
    initialized: contextValue.initialized,
    hasProfile: !!profile,
    isRestoring,
    userId: currentUserId.current
  });

  return (
    <ProfileContext.Provider value={contextValue}>
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
