
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/auth';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import { fetchOrCreateProfile } from '@/utils/profileManagement';
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
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const authOperations = useAuthOperations();

  const refreshProfile = useCallback(async () => {
    if (!user) return;

    console.log('Refreshing profile for user:', user.id);
    setProfileLoading(true);
    try {
      const profileData = await fetchOrCreateProfile(user.id);
      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      toast({
        title: "Error",
        description: "Failed to refresh user profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  // Debounced profile fetcher for initial load and auth state changes
  const fetchProfileDebounced = useCallback(async (userId: string) => {
    console.log('Fetching profile for user:', userId);
    setProfileLoading(true);
    try {
      const profileData = await fetchOrCreateProfile(userId);
      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load user profile. Please try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Add a small delay to allow any pending operations to complete
        timeoutId = setTimeout(() => {
          fetchProfileDebounced(session.user.id);
        }, 100);
      } else {
        setProfileLoading(false);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Clear any pending timeout
        if (timeoutId) clearTimeout(timeoutId);
        // Set new timeout for profile fetch
        timeoutId = setTimeout(() => {
          fetchProfileDebounced(session.user.id);
        }, 100);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchProfileDebounced]);

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      profile, 
      loading,
      profileLoading,
      refreshProfile,
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

