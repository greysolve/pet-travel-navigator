
import React, { createContext, useContext, useEffect, useState } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<ProfileError | null>(null);
  const authOperations = useAuthOperations();

  const loadProfile = async (userId: string) => {
    console.log('Starting profile load for user:', userId);
    setProfileLoading(true);
    setProfileError(null);
    
    try {
      const profileData = await fetchProfile(userId);
      console.log('Profile loaded successfully:', profileData);
      setProfile(profileData);
      setProfileLoading(false); // Reset loading immediately after successful profile load
    } catch (error) {
      console.error('Error loading profile:', error);
      if (error instanceof ProfileError) {
        setProfileError(error);
        toast({
          title: "Profile Error",
          description: "There was a problem loading your profile. You may want to try signing out and back in.",
          variant: "destructive",
        });
      }
      setProfileLoading(false); // Reset loading on error
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const setupAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (initialSession?.user) {
          console.log('Initial session found:', initialSession.user.id);
          setSession(initialSession);
          setUser(initialSession.user);
          await loadProfile(initialSession.user.id);
        } else {
          // Reset states when no session is found
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileError(null);
          setProfileLoading(false);
        }
      } catch (error) {
        console.error('Error during auth setup:', error);
        if (mounted) {
          setProfileLoading(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    setupAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state changed:', event, currentSession?.user?.id);
      
      if (!mounted) return;

      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        await loadProfile(currentSession.user.id);
      } else {
        // Reset all states when user signs out
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileError(null);
        setProfileLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      profile,
      loading,
      profileLoading,
      profileError,
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
