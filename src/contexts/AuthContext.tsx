
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
  searchCount: number;
  updateSearchCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<ProfileError | null>(null);
  const [searchCount, setSearchCount] = useState<number>(0);
  const [initialized, setInitialized] = useState(false);
  const authOperations = useAuthOperations();

  const updateSearchCount = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('search_count')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setSearchCount(data.search_count);
        if (profile) {
          setProfile({
            ...profile,
            search_count: data.search_count
          });
        }
      }
    } catch (error) {
      console.error('Error updating search count:', error);
    }
  };

  const loadProfile = async (userId: string) => {
    console.log('Starting profile load for user:', userId);
    setProfileLoading(true);
    setProfileError(null);
    
    try {
      const profileData = await fetchProfile(userId);
      console.log('Profile loaded successfully:', profileData);
      setProfile(profileData);
      setSearchCount(profileData.search_count);
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
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle initial session check
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log('Initial session check:', initialSession?.user?.id || 'No session');
        
        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          await loadProfile(initialSession.user.id);
        } else {
          // Clear all states immediately if no session
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileError(null);
          setSearchCount(0);
        }
      } catch (error) {
        console.error('Error checking initial session:', error);
        // Reset states on error
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileError(null);
        setSearchCount(0);
      } finally {
        // Always set loading and initialized to false when done
        setLoading(false);
        setInitialized(true);
      }
    };

    checkSession();
  }, []);

  // Handle auth state changes
  useEffect(() => {
    if (!initialized) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state changed:', event, currentSession?.user?.id);

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
        setSearchCount(0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialized]);

  // If we haven't completed initial load, show nothing
  if (!initialized) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      profile,
      loading,
      profileLoading,
      profileError,
      searchCount,
      updateSearchCount,
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
