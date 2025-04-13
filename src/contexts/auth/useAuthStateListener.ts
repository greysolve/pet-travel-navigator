
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthAction } from './AuthState';

/**
 * Hook to listen for auth state changes
 */
export function useAuthStateListener(
  dispatch: React.Dispatch<AuthAction>,
  isRestoring: boolean
) {
  const mounted = useRef(true);

  useEffect(() => {
    // Only set up the listener if we're done restoring
    if (isRestoring) return;
    
    // Set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event);
        
        if (!mounted.current) return;
        
        if (event === 'SIGNED_OUT') {
          dispatch({ type: 'SIGN_OUT' });
          return;
        }
        
        if (session) {
          dispatch({
            type: 'SET_AUTH_STATE',
            payload: { session, user: session.user },
          });
        }
      }
    );
    
    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [dispatch, isRestoring]);
}
