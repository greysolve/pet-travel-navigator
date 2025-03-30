
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Validates a Supabase session by making a test request
 */
export async function validateSession(session: Session): Promise<boolean> {
  try {
    console.log("ValidateSession: Validating session for user:", session.user.id);
    
    // Check if the session token is valid by making a test request
    const { data, error } = await supabase.auth.getUser(session.access_token);
    
    if (error) {
      console.error('ValidateSession: Session validation failed:', error);
      return false;
    }
    
    if (!data || !data.user) {
      console.error('ValidateSession: No user returned from validation');
      return false;
    }
    
    console.log("ValidateSession: Session validated successfully for user:", data.user.id);
    return true;
  } catch (error) {
    console.error('ValidateSession: Session validation error:', error);
    return false;
  }
}
