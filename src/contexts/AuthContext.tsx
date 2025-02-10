
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const authOperations = useAuthOperations();

  // Profile fetch with retries
  const fetchProfileWithRetries = useCallback(async (userId: string, retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 1000;

    try {
      const profileData = await fetchOrCreateProfile(userId);
      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error(`Profile fetch attempt ${retryCount + 1} failed:`, error);
      if (retryCount < maxRetries) {
        setTimeout(() => {
          fetchProfileWithRetries(userId, retryCount + 1);
        }, retryDelay * Math.pow(2, retryCount));
      } else {
        console.error('Max retries reached for profile fetch');
        toast({
          title: "Error",
          description: "Failed to load user profile. Please try signing in again.",
          variant: "destructive",
        });
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Handle session recovery and auth state changes
  useEffect(() => {
    const handleAuthChange = async (event: string, currentSession: Session | null) => {
      console.log('Auth state changed:', event, currentSession?.user?.id);
      
      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        await fetchProfileWithRetries(currentSession.user.id);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
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

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfileWithRetries]);

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      profile, 
      loading,
      profileLoading,
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
