
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types/auth';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { ProfileError } from '@/utils/profileManagement';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authOperations = useAuthOperations();

  // Use React Query for profile management
  const {
    data: profile,
    isLoading: profileLoading,
    error: queryError,
    refetch: retryProfileLoad
  } = useProfileQuery(user?.id);

  // Convert query error to ProfileError type for consistency
  const profileError = queryError instanceof ProfileError
    ? queryError
    : queryError
      ? new ProfileError('Unexpected error', 'unknown')
      : null;

  // Show error toast when profile fails to load
  useEffect(() => {
    if (profileError) {
      const errorMessages = {
        timeout: "Profile load timed out. Please try again.",
        not_found: "Profile not found. Please sign out and back in.",
        network: "Network error loading profile. Please check your connection.",
        unknown: "Unexpected error loading profile. Please try again."
      };
      
      toast({
        title: "Error",
        description: errorMessages[profileError.type],
        variant: "destructive",
      });
    }
  }, [profileError]);

  // Handle session changes
  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('Initial session check:', initialSession?.user?.id);
      if (initialSession?.user) {
        setSession(initialSession);
        setUser(initialSession.user);
      }
      setLoading(false);
    });

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log('Auth state changed:', event, currentSession?.user?.id);
      
      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
      } else {
        setSession(null);
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      profile: profile || null,
      loading,
      profileLoading,
      profileError,
      retryProfileLoad: () => retryProfileLoad(),
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
