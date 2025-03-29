
import React, { createContext, useContext } from 'react';
import { useUser } from '../user/UserContext';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import type { Session, User, AuthError } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: AuthError | Error | null;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error?: any }>;
  updatePassword: (newPassword: string) => Promise<{ error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, session, authLoading, initialized, authError, lifecycleState } = useUser();
  const authOperations = useAuthOperations();
  
  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading: authLoading,
        initialized,
        error: authError,
        ...authOperations,
      }}
    >
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
