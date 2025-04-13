
import { useEffect } from 'react';
import { AuthAction } from './AuthState';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to listen for authentication state changes
 */
export function useAuthStateListener(
  dispatch: React.Dispatch<AuthAction>,
  isRestoring: boolean
) {
  useEffect(() => {
    if (isRestoring) {
      console.log('AuthStateListener: Not setting up auth listener during restoration');
      return;
    }

    console.log('AuthStateListener: Setting up auth state change listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('AuthStateListener: Auth state changed:', event, currentSession?.user?.id);
      
      if (event === 'SIGNED_OUT') {
        console.log('AuthStateListener: User signed out, dispatching SIGN_OUT action');
        dispatch({ type: 'SIGN_OUT' });
        return;
      }

      if (currentSession) {
        console.log('AuthStateListener: Session valid, dispatching SET_AUTH_STATE action');
        dispatch({
          type: 'SET_AUTH_STATE',
          payload: {
            session: currentSession,
            user: currentSession.user,
          },
        });
      }
    });

    return () => {
      console.log('AuthStateListener: Cleaning up auth state change listener');
      subscription.unsubscribe();
    };
  }, [isRestoring, dispatch]);
}
