
import React, { createContext, useContext, useReducer } from 'react';
import { authReducer, initialAuthState, AuthState } from './AuthState';
import { useAuthInitializer } from './useAuthInitializer';
import { useAuthStateListener } from './useAuthStateListener';
import { useAuthOperations } from '@/hooks/useAuthOperations';

interface AuthContextType extends AuthState {
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error?: any }>;
  updatePassword: (newPassword: string) => Promise<{ error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const authOperations = useAuthOperations();
  
  // Initialize auth state
  useAuthInitializer(dispatch, state.isRestoring);
  
  // Set up auth state change listener
  useAuthStateListener(dispatch, state.isRestoring);

  return (
    <AuthContext.Provider
      value={{
        ...state,
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
