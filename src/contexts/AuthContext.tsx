
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types/auth';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import { fetchProfile, ProfileError } from '@/utils/profileManagement';
import { toast } from '@/components/ui/use-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  profileLoading: boolean;
  profileError: ProfileError | null;
  retryProfileLoad: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<ProfileError | null>(null);
  const authOperations = useAuthOperations();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Add refs for caching
  const lastProfileFetchRef = useRef<number>(0);
  const lastFetchedUserIdRef = useRef<string | null>(null);

  // Profile fetch with improved caching
  const loadProfile = useCallback(async (userId: string, forceReload: boolean = false) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastProfileFetchRef.current;
    
    // Skip if we recently fetched this user's profile and it's not a forced reload
    if (!forceReload && 
        userId === lastFetchedUserIdRef.current && 
        timeSinceLastFetch < PROFILE_CACHE_DURATION) {
      console.log('Using cached profile for user:', userId);
      return;
    }

    // Clear any existing abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    setProfileLoading(true);
    setProfileError(null);

    try {
      const profileData = await fetchProfile(userId);
      setProfile(profileData);
      setProfileError(null);
      
      // Update cache metadata
      lastProfileFetchRef.current = now;
      lastFetchedUserIdRef.current = userId;
      
      console.log('Profile loaded and cached for user:', userId);
    } catch (error) {
      console.error('Profile fetch failed:', error);
      if (error instanceof ProfileError) {
        setProfileError(error);
        
        // Show appropriate toast based on error type
        const errorMessages = {
          timeout: "Profile load timed out. Please try again.",
          not_found: "Profile not found. Please sign out and back in.",
          network: "Network error loading profile. Please check your connection.",
          unknown: "Unexpected error loading profile. Please try again."
        };
        
        toast({
          title: "Error",
          description: errorMessages[error.type],
          variant: "destructive",
        });
      } else {
        setProfileError(new ProfileError('Unexpected error', 'unknown'));
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Retry profile load with force reload
  const retryProfileLoad = useCallback(async () => {
    if (user?.id) {
      await loadProfile(user.id, true); // Force reload on retry
    }
  }, [user?.id, loadProfile]);

  // Handle session recovery and auth state changes
  useEffect(() => {
    const handleAuthChange = async (event: string, currentSession: Session | null) => {
      console.log('Auth state changed:', event, currentSession?.user?.id);
      
      if (currentSession?.user) {
        const isNewSession = !session || session.user.id !== currentSession.user.id;
        setSession(currentSession);
        setUser(currentSession.user);
        
        // Only load profile if it's a new session or login event
        if (isNewSession || event === 'SIGNED_IN') {
          console.log('Loading profile for new session or sign in');
          await loadProfile(currentSession.user.id, true);
        }
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileError(null);
        setProfileLoading(false);
        lastFetchedUserIdRef.current = null;
      }
    };

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('Initial session check:', initialSession?.user?.id);
      handleAuthChange('INITIAL_SESSION', initialSession);
      setLoading(false);
    });

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Cleanup function
    return () => {
      subscription.unsubscribe();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadProfile, session]);

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      profile, 
      loading,
      profileLoading,
      profileError,
      retryProfileLoad,
      ...authOperations
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
