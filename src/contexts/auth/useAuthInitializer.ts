
import { useEffect, useRef } from 'react';
import { AuthAction } from './AuthState';
import { supabase } from '@/integrations/supabase/client';
import { validateSession } from './useSessionValidator';

/**
 * Hook to initialize authentication state
 */
export function useAuthInitializer(
  dispatch: React.Dispatch<AuthAction>,
  isRestoring: boolean
) {
  const mounted = useRef(true);
  const abortController = useRef<AbortController | null>(null);

  // Safe dispatch function
  const safeDispatch = (action: AuthAction) => {
    if (mounted.current) {
      dispatch(action);
    }
  };

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
        if (error instanceof Error) {
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
  }, [dispatch]);
}
