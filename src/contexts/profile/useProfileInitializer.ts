
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useProfileInitializer(onAuthChange: (userId: string | null) => void) {
  const [isRestoring, setIsRestoring] = useState(true);
  
  useEffect(() => {
    const checkAuthContext = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setIsRestoring(false);
        
        // If there's a session, trigger profile load
        if (data.session?.user?.id) {
          onAuthChange(data.session.user.id);
        }
      } catch (error) {
        console.error("Error checking auth context:", error);
        setIsRestoring(false);
      }
    };
    
    checkAuthContext();
  }, [onAuthChange]);

  useEffect(() => {
    if (isRestoring) return;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isRestoring) return;
      
      console.log('Profile context - Auth state changed:', { event, userId: session?.user?.id });

      if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing profile state');
        onAuthChange(null);
        return;
      }

      const userId = session?.user?.id;
      if (userId) {
        onAuthChange(userId);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isRestoring, onAuthChange]);

  return { isRestoring };
}
