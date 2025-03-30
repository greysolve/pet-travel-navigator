
import React, { createContext, useContext, useReducer } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import { AuthState, initialAuthState, authReducer } from './AuthState';
import { useAuthInitializer } from './useAuthInitializer';
import { useAuthStateListener } from './useAuthStateListener';

// Create the auth context
interface AuthContextType extends AuthState {
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error?: AuthError }>;
  updatePassword: (newPassword: string) => Promise<{ error?: AuthError }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const authOperations = useAuthOperations();
  
  // Initialize auth state
  useAuthInitializer(dispatch, state.isRestoring);
  
  // Listen for auth state changes
  useAuthStateListener(dispatch, state.isRestoring);
  
  const value: AuthContextType = {
    ...state,
    signIn: authOperations.signIn,
    signInWithEmail: authOperations.signInWithEmail,
    signUp: authOperations.signUp,
    signOut: authOperations.signOut,
    resetPasswordForEmail: authOperations.resetPasswordForEmail,
    updatePassword: authOperations.updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook for using the auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
