
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useProfileInitializer(onAuthChange: (userId: string | null) => void) {
  const [isRestoring, setIsRestoring] = useState(true);
  
  // Initialize profile based on current session
  useEffect(() => {
    let isMounted = true;
    const initTimeout = setTimeout(() => {
      if (isMounted && isRestoring) {
        console.log('ProfileInitializer: Timed out waiting for session restoration');
        setIsRestoring(false);
      }
    }, 5000); // Set a reasonable timeout

    const checkAuthContext = async () => {
      try {
        console.log('ProfileInitializer: Checking for existing session');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('ProfileInitializer: Error getting session:', error);
          if (isMounted) setIsRestoring(false);
          return;
        }
        
        if (data.session?.user?.id) {
          console.log('ProfileInitializer: Found existing session for user:', data.session.user.id);
          onAuthChange(data.session.user.id);
        } else {
          console.log('ProfileInitializer: No existing session found');
        }
        
        if (isMounted) setIsRestoring(false);
      } catch (error) {
        console.error("ProfileInitializer: Error checking auth context:", error);
        if (isMounted) setIsRestoring(false);
      }
    };
    
    checkAuthContext();
    
    return () => {
      isMounted = false;
      clearTimeout(initTimeout);
    };
  }, [onAuthChange]);

  // Set up auth state change listener
  useEffect(() => {
    if (isRestoring) {
      console.log('ProfileInitializer: Skipping auth listener setup during restoration');
      return;
    }
    
    console.log('ProfileInitializer: Setting up auth state change listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('ProfileInitializer: Auth state changed:', event, session?.user?.id);

      if (event === 'SIGNED_OUT') {
        console.log('ProfileInitializer: User signed out, clearing profile');
        onAuthChange(null);
        return;
      }

      const userId = session?.user?.id;
      if (userId) {
        console.log('ProfileInitializer: User authenticated, triggering profile load for:', userId);
        onAuthChange(userId);
      }
    });

    return () => {
      console.log('ProfileInitializer: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, [isRestoring, onAuthChange]);

  return { isRestoring };
}
