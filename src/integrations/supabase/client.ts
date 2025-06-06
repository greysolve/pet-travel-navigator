
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://jhokkuszubzngrcamfdb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impob2trdXN6dWJ6bmdyY2FtZmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1MTU0MzQsImV4cCI6MjA1MzA5MTQzNH0.raNfn4e-a6EISXQpuyez3mUDzKpao3Zs4AYJiJZrZbU";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

/**
 * Clears any stored authentication data from local storage
 * This is useful when you want to ensure no auth data remains after sign out
 */
export const clearAuthData = () => {
  try {
    // Clear any auth-related data from localStorage
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('supabase.auth.refreshToken');
    localStorage.removeItem('supabase.auth.expires_at');
    
    // Remove any other auth-related items that might be stored
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('supabase.auth.')) {
        keysToRemove.push(key);
      }
    }
    
    // Remove the collected keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('Auth data cleared from local storage');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};
