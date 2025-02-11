
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
  const lastProfileFetchRef = useRef<number>(0);
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const retryCountRef = useRef<number>(0);
  const initialLoadRef = useRef(true);

  const loadProfile = useCallback(async (userId: string, options: { 
    forceReload?: boolean,
    isBackgroundRefresh?: boolean 
  } = {}) => {
    const { forceReload = false, isBackgroundRefresh = false } = options;
    const now = Date.now();
    const timeSinceLastFetch = now - lastProfileFetchRef.current;
    
    // Only use cache if:
    // 1. Not forcing a reload
    // 2. Not a background refresh
    // 3. Same user as last fetch
    // 4. Profile exists for this user
    // 5. Within cache duration
    if (!forceReload && 
        !isBackgroundRefresh &&
        userId === lastFetchedUserIdRef.current && 
        profile?.id === userId &&
        timeSinceLastFetch < PROFILE_CACHE_DURATION) {
      console.log('Using cached profile for user:', userId);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
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
      retryCountRef.current = 0;
      
      lastProfileFetchRef.current = now;
      lastFetchedUserIdRef.current = userId;
      
      console.log('Profile loaded and cached for user:', userId);
    } catch (error) {
      console.error('Profile fetch failed:', error);
      
      if (error instanceof ProfileError) {
        if (!isBackgroundRefresh) {
          setProfileError(error);
        }
        
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

        if (retryCountRef.current < 3) {
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

  const retryProfileLoad = useCallback(async () => {
    if (user?.id) {
      retryCountRef.current = 0;
      await loadProfile(user.id, { forceReload: true });
    }
  }, [user?.id, loadProfile]);

  useEffect(() => {
    let mounted = true;
    const setupAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (initialSession?.user) {
          console.log('Initial session found:', initialSession.user.id);
          setSession(initialSession);
          setUser(initialSession.user);
          await loadProfile(initialSession.user.id);
        }
      } catch (error) {
        console.error('Error during auth setup:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          initialLoadRef.current = false;
        }
      }
    };

    setupAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state changed:', event, currentSession?.user?.id);
      
      if (!mounted) return;

      if (currentSession?.user) {
        const isNewSession = !session || session.user.id !== currentSession.user.id;
        const isInitialLoad = initialLoadRef.current;
        
        // Only update session and user if there's actually a change
        if (isNewSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Only load profile for new sessions or explicit sign ins
          if (!isInitialLoad || event === 'SIGNED_IN') {
            console.log('Loading profile for new session or sign in');
            await loadProfile(currentSession.user.id);
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
    });

    return () => {
      mounted = false;
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
