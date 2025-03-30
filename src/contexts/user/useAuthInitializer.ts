
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserAction } from './UserState';
import { loadUserProfile } from './useUserProfile';

/**
 * Hook to initialize auth state
 */
export function useAuthInitializer(dispatch: React.Dispatch<UserAction>) {
  useEffect(() => {
    const initializeAuth = async () => {
      dispatch({ type: 'AUTH_INIT_START' });
      
      // Check for existing session
      supabase.auth.getSession().then(
        ({ data: { session } }) => {
          console.log('UserContext - Initial session check:', session?.user?.id);
          
          dispatch({
            type: 'AUTH_INIT_SUCCESS',
            payload: {
              session,
              user: session?.user || null,
            },
          });
          
          // If we have a user, load their profile
          if (session?.user) {
            loadUserProfile(session.user.id, dispatch);
          }
        },
        (error) => {
          console.error('UserContext - Error retrieving session:', error);
          dispatch({ 
            type: 'AUTH_INIT_ERROR', 
            payload: error instanceof Error ? error : new Error(String(error)) 
          });
        }
      );
    };
    
    initializeAuth();
  }, [dispatch]);
}
