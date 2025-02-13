
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import { toast } from '@/components/ui/use-toast';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: AuthError | Error | null;
  isRestoring: boolean;
}

type AuthAction =
  | { type: 'START_LOADING' }
  | { type: 'SET_AUTH_STATE'; payload: { session: Session | null; user: User | null } }
  | { type: 'RESTORE_AUTH_STATE'; payload: { session: Session | null; user: User | null } }
  | { type: 'SET_ERROR'; payload: AuthError | Error }
  | { type: 'INITIALIZE_SUCCESS' }
  | { type: 'COMPLETE_RESTORATION' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SIGN_OUT' };

interface AuthContextType extends AuthState {
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const initialState: AuthState = {
  session: null,
  user: null,
  loading: true,
  initialized: false,
  error: null,
  isRestoring: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, loading: true, error: null };
    case 'SET_AUTH_STATE':
      return {
        ...state,
        session: action.payload.session,
        user: action.payload.user,
        loading: false,
        error: null,
      };
    case 'RESTORE_AUTH_STATE':
      return {
        ...state,
        session: action.payload.session,
        user: action.payload.user,
        loading: false,
        error: null,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case 'INITIALIZE_SUCCESS':
      return {
        ...state,
        initialized: true,
        loading: false,
      };
    case 'COMPLETE_RESTORATION':
      return {
        ...state,
        isRestoring: false,
        initialized: true,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SIGN_OUT':
      return {
        ...initialState,
        loading: false,
        initialized: true,
        isRestoring: false,
      };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const authOperations = useAuthOperations();
  const mounted = useRef(true);
  const abortController = useRef<AbortController | null>(null);

  // Safe dispatch function
  const safeDispatch = (action: AuthAction) => {
    if (mounted.current) {
      dispatch(action);
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      abortController.current = new AbortController();
      
      try {
        dispatch({ type: 'START_LOADING' });
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session initialization error:', sessionError);
          throw sessionError;
        }

        if (session) {
          const isValid = await validateSession(session);
          if (!isValid) {
            console.log('Invalid session detected, signing out');
            await supabase.auth.signOut();
            safeDispatch({ type: 'SIGN_OUT' });
            return;
          }
          
          safeDispatch({
            type: 'RESTORE_AUTH_STATE',
            payload: { 
              session, 
              user: session.user 
            },
          });
        } else {
          safeDispatch({ type: 'RESTORE_AUTH_STATE', payload: { session: null, user: null } });
        }

        safeDispatch({ type: 'COMPLETE_RESTORATION' });
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (error instanceof AuthError) {
          safeDispatch({ type: 'SET_ERROR', payload: error });
        } else {
          safeDispatch({ type: 'SET_ERROR', payload: new Error('Failed to initialize auth') });
        }
      }
    };

    initializeAuth();

    return () => {
      mounted.current = false;
      abortController.current?.abort();
    };
  }, []);

  // Handle auth state changes
  useEffect(() => {
    if (state.isRestoring) {
      console.log('Not setting up auth listener during restoration');
      return;
    }

    console.log('Setting up auth state change listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state changed:', event, currentSession?.user?.id);
      
      if (event === 'SIGNED_OUT') {
        safeDispatch({ type: 'SIGN_OUT' });
        return;
      }

      if (currentSession) {
        const isValid = await validateSession(currentSession);
        if (!isValid) {
          console.log('Invalid session in auth change, signing out');
          await supabase.auth.signOut();
          safeDispatch({ type: 'SIGN_OUT' });
          return;
        }

        safeDispatch({
          type: 'SET_AUTH_STATE',
          payload: {
            session: currentSession,
            user: currentSession.user,
          },
        });
      }
    });

    return () => {
      console.log('Cleaning up auth state change listener');
      subscription.unsubscribe();
    };
  }, [state.isRestoring]);

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
