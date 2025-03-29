
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Validates a Supabase session by making a test request
 */
export async function validateSession(session: Session): Promise<boolean> {
  try {
    // Check if the session token is valid by making a test request
    const { error } = await supabase.auth.getUser(session.access_token);
    if (error) {
      console.error('Session validation failed:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}
