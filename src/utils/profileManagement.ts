
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/types/auth";
import { toast } from "@/components/ui/use-toast";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchProfileWithRetry(userId: string, retryCount = 0): Promise<UserProfile> {
  try {
    console.log(`Attempting to fetch profile for user ${userId}, attempt ${retryCount + 1}`);
    
    // First, get the user's role - this MUST exist
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleError) {
      console.error('Error fetching role:', roleError);
      throw new Error('Failed to fetch user role');
    }

    if (!roleData) {
      throw new Error('No role found for user');
    }

    // Then, get the profile data - this MUST exist
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    if (!profileData) {
      throw new Error('No profile found for user');
    }

    // Log the raw data for debugging
    console.log('Role data:', roleData);
    console.log('Profile data:', profileData);

    // Parse notification preferences
    const notificationPreferences = profileData.notification_preferences as {
      travel_alerts: boolean;
      policy_changes: boolean;
      documentation_reminders: boolean;
    } | null;

    // Create the user profile object - no optional chaining, no defaults
    const userProfile: UserProfile = {
      id: userId,
      userRole: roleData.role,
      created_at: profileData.created_at,
      updated_at: profileData.updated_at,
      full_name: profileData.full_name,
      avatar_url: profileData.avatar_url,
      address_line1: profileData.address_line1,
      address_line2: profileData.address_line2,
      address_line3: profileData.address_line3,
      locality: profileData.locality,
      administrative_area: profileData.administrative_area,
      postal_code: profileData.postal_code,
      country_id: profileData.country_id,
      address_format: profileData.address_format,
      plan: profileData.plan,
      search_count: profileData.search_count,
      notification_preferences: notificationPreferences
    };

    console.log('Mapped profile:', userProfile);
    return userProfile;

  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log('Retrying profile fetch...');
      await wait(INITIAL_RETRY_DELAY * Math.pow(2, retryCount));
      return fetchProfileWithRetry(userId, retryCount + 1);
    }
    console.error('Error in fetchProfileWithRetry:', error);
    throw error;
  }
}

export async function fetchOrCreateProfile(userId: string): Promise<UserProfile> {
  try {
    console.log('Starting fetchOrCreateProfile for user:', userId);
    return await fetchProfileWithRetry(userId);
  } catch (error) {
    console.error('Error in profile management:', error);
    toast({
      title: "Error",
      description: "Failed to load user profile. Please try signing in again.",
      variant: "destructive",
    });
    throw error; // Re-throw to be handled by the auth context
  }
}
