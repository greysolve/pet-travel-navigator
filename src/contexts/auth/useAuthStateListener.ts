
import { useEffect } from 'react';
import { AuthAction } from './AuthState';
import { supabase } from '@/integrations/supabase/client';
import { validateSession } from './useSessionValidator';

/**
 * Hook to listen for authentication state changes
 */
export function useAuthStateListener(
  dispatch: React.Dispatch<AuthAction>,
  isRestoring: boolean
) {
  useEffect(() => {
    if (isRestoring) {
      console.log('Not setting up auth listener during restoration');
      return;
    }

    console.log('Setting up auth state change listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state changed:', event, currentSession?.user?.id);
      
      if (event === 'SIGNED_OUT') {
        dispatch({ type: 'SIGN_OUT' });
        return;
      }

      if (currentSession) {
        const isValid = await validateSession(currentSession);
        if (!isValid) {
          console.log('Invalid session in auth change, signing out');
          await supabase.auth.signOut();
          dispatch({ type: 'SIGN_OUT' });
          return;
        }

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
      console.log('Cleaning up auth state change listener');
      subscription.unsubscribe();
    };
  }, [isRestoring, dispatch]);
}
