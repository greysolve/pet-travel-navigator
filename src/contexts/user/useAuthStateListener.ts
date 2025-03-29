
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserAction } from './UserState';
import { loadUserProfile } from './useUserProfile';

/**
 * Hook to listen for auth state changes
 */
export function useAuthStateListener(dispatch: React.Dispatch<UserAction>) {
  useEffect(() => {
    // First set up listener for auth changes to avoid race conditions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('UserContext - Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_OUT') {
          dispatch({ type: 'AUTH_SIGN_OUT' });
          return;
        }
        
        if (session) {
          dispatch({
            type: 'AUTH_STATE_CHANGE',
            payload: { session, user: session.user },
          });
          
          // Load profile after auth state change, but not during initialization
          // Use setTimeout to avoid potential Supabase SDK deadlocks
          setTimeout(() => {
            loadUserProfile(session.user.id, dispatch);
          }, 0);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch]);
}
