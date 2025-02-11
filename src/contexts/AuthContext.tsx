
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
  isRefreshing: boolean;
  profileError: ProfileError | null;
  retryProfileLoad: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const RETRY_DELAY = 1000; // 1 second initial retry delay

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profileError, setProfileError] = useState<ProfileError | null>(null);
  const authOperations = useAuthOperations();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Add refs for caching and retry management
  const lastProfileFetchRef = useRef<number>(0);
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const retryCountRef = useRef<number>(0);

  // Profile fetch with improved caching and background refresh
  const loadProfile = useCallback(async (userId: string, options: { 
    forceReload?: boolean,
    isBackgroundRefresh?: boolean 
  } = {}) => {
    const { forceReload = false, isBackgroundRefresh = false } = options;
    const now = Date.now();
    const timeSinceLastFetch = now - lastProfileFetchRef.current;
    
    // Skip if we have a valid cached profile for this user
    if (!forceReload && 
        !isBackgroundRefresh &&
        userId === lastFetchedUserIdRef.current && 
        profile?.id === userId &&
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
    
    // Set loading state based on whether this is a background refresh
    if (!isBackgroundRefresh) {
      setProfileLoading(true);
    } else {
      setIsRefreshing(true);
    }

    if (!isBackgroundRefresh) {
      setProfileError(null);
    }

    try {
      const profileData = await fetchProfile(userId);
      setProfile(profileData);
      setProfileError(null);
      retryCountRef.current = 0; // Reset retry count on success
      
      // Update cache metadata
      lastProfileFetchRef.current = now;
      lastFetchedUserIdRef.current = userId;
      
      console.log('Profile loaded and cached for user:', userId);
    } catch (error) {
      console.error('Profile fetch failed:', error);
      
      if (error instanceof ProfileError) {
        // Only set error state if this wasn't a background refresh
        if (!isBackgroundRefresh) {
          setProfileError(error);
        }
        
        // Show appropriate toast based on error type
        const errorMessages = {
          timeout: "Profile refresh timed out. Using cached data.",
          not_found: "Could not refresh profile. Using cached data.",
          network: "Network error refreshing profile. Using cached data.",
          unknown: "Error refreshing profile. Using cached data."
        };
        
        if (isBackgroundRefresh) {
          toast({
            title: "Background Refresh Error",
            description: errorMessages[error.type],
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: error.type === 'not_found' 
              ? "Profile not found. Please sign out and back in."
              : "Error loading profile. Please try again.",
            variant: "destructive",
          });
        }

        // Implement exponential backoff for retries
        if (retryCountRef.current < 3) { // Max 3 retry attempts
          const retryDelay = RETRY_DELAY * Math.pow(2, retryCountRef.current);
          retryCountRef.current++;
          setTimeout(() => {
            loadProfile(userId, { isBackgroundRefresh: true });
          }, retryDelay);
        }
      }
    } finally {
      if (!isBackgroundRefresh) {
        setProfileLoading(false);
      }
      setIsRefreshing(false);
    }
  }, [profile]);

  // Retry profile load with force reload
  const retryProfileLoad = useCallback(async () => {
    if (user?.id) {
      retryCountRef.current = 0; // Reset retry count on manual retry
      await loadProfile(user.id, { forceReload: true });
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
        
        // Initial sign in or new session
        if (isNewSession || event === 'SIGNED_IN') {
          console.log('Loading profile for new session or sign in');
          await loadProfile(currentSession.user.id);
        } 
        // Check for cache expiration on page reload
        else if (event === 'INITIAL_SESSION') {
          const timeSinceLastFetch = Date.now() - lastProfileFetchRef.current;
          if (timeSinceLastFetch >= PROFILE_CACHE_DURATION) {
            console.log('Cache expired, refreshing profile in background');
            loadProfile(currentSession.user.id, { isBackgroundRefresh: true });
          }
        }
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileError(null);
        setProfileLoading(false);
        setIsRefreshing(false);
        lastFetchedUserIdRef.current = null;
        retryCountRef.current = 0;
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
  }, [loadProfile, profile, session]);

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      profile, 
      loading,
      profileLoading,
      isRefreshing,
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
