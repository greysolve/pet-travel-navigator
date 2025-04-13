
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Validates that a session is still valid
 */
export async function validateSession(session: Session): Promise<boolean> {
  if (!session) return false;
  
  try {
    // Check if the session is still valid
    const { data, error } = await supabase.auth.getUser(session.access_token);
    
    if (error) {
      console.error('Session validation error:', error);
      return false;
    }
    
    return !!data.user;
  } catch (error) {
    console.error('Session validation exception:', error);
    return false;
  }
}
