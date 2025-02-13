
import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuthOperations } from '@/hooks/useAuthOperations';
import { toast } from '@/components/ui/use-toast';

// Combined auth state type for atomic updates
interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: AuthError | Error | null;
}

// Auth state reducer actions
type AuthAction =
  | { type: 'START_LOADING' }
  | { type: 'SET_AUTH_STATE'; payload: { session: Session | null; user: User | null } }
  | { type: 'SET_ERROR'; payload: AuthError | Error }
  | { type: 'INITIALIZE_SUCCESS' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SIGN_OUT' };

// Auth context type
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
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SIGN_OUT':
      return {
        ...initialState,
        loading: false,
        initialized: true,
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
  const pendingAuthChanges = useRef<Array<() => void>>([]);
  const abortController = useRef<AbortController | null>(null);

  // Simplified session validation
  const validateSession = async (session: Session | null): Promise<boolean> => {
    if (!session?.access_token) return false;
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser(session.access_token);
      if (error || !user) {
        console.error('Session validation failed:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  };

  // Safe state update function
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
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session initialization error:', sessionError);
          throw sessionError;
        }

        if (session) {
          // Attempt to refresh the session
          const { data: { session: refreshedSession }, error: refreshError } = 
            await supabase.auth.refreshSession();

          if (refreshError) {
            console.error('Session refresh failed:', refreshError);
            await supabase.auth.signOut();
            safeDispatch({ type: 'SIGN_OUT' });
            return;
          }

          const isValid = await validateSession(refreshedSession || session);
          if (!isValid) {
            console.log('Invalid session detected, signing out');
            await supabase.auth.signOut();
            safeDispatch({ type: 'SIGN_OUT' });
            return;
          }
          
          safeDispatch({
            type: 'SET_AUTH_STATE',
            payload: { 
              session: refreshedSession || session, 
              user: (refreshedSession || session).user 
            },
          });
        } else {
          safeDispatch({ type: 'SET_AUTH_STATE', payload: { session: null, user: null } });
        }

        safeDispatch({ type: 'INITIALIZE_SUCCESS' });
        
        while (pendingAuthChanges.current.length > 0) {
          const change = pendingAuthChanges.current.shift();
          change?.();
        }
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
      pendingAuthChanges.current = [];
    };
  }, []);

  // Handle auth state changes
  useEffect(() => {
    if (!state.initialized) {
      console.log('Queuing auth state change listener until initialized');
      return;
    }

    console.log('Setting up auth state change listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state changed:', event, currentSession?.user?.id);
      
      const handleAuthChange = async () => {
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
      };

      if (!state.initialized) {
        console.log('Queueing auth state change');
        pendingAuthChanges.current.push(handleAuthChange);
      } else {
        await handleAuthChange();
      }
    });

    return () => {
      console.log('Cleaning up auth state change listener');
      subscription.unsubscribe();
    };
  }, [state.initialized]);

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

