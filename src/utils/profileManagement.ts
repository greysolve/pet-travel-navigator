
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/types/auth";

const QUERY_TIMEOUT = 5000; // 5 seconds timeout

class ProfileError extends Error {
  constructor(
    message: string,
    public readonly type: 'timeout' | 'not_found' | 'network' | 'unknown'
  ) {
    super(message);
    this.name = 'ProfileError';
  }
}

async function fetchProfile(userId: string): Promise<UserProfile> {
  console.log('Fetching profile for user:', userId);
  
  // Create a timeout promise
  const timeout = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new ProfileError('Profile fetch timed out', 'timeout'));
    }, QUERY_TIMEOUT);
  });

  try {
    // Get the user's role with timeout
    const rolePromise = supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: roleData, error: roleError } = await Promise.race([
      rolePromise,
      timeout
    ]) as Awaited<ReturnType<typeof rolePromise>>;

    if (roleError) {
      console.error('Error fetching role:', roleError);
      throw new ProfileError('Failed to fetch user role', 'network');
    }

    if (!roleData) {
      console.error('No role found for user');
      throw new ProfileError('User role not found', 'not_found');
    }

    // Get the profile data with timeout
    const profilePromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const { data: profileData, error: profileError } = await Promise.race([
      profilePromise,
      timeout
    ]) as Awaited<ReturnType<typeof profilePromise>>;

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new ProfileError('Failed to fetch user profile', 'network');
    }

    if (!profileData) {
      console.error('No profile found for user');
      throw new ProfileError('User profile not found', 'not_found');
    }

    // Parse notification preferences
    const notificationPreferences = profileData.notification_preferences as {
      travel_alerts: boolean;
      policy_changes: boolean;
      documentation_reminders: boolean;
    } | null;

    // Create the user profile object
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

    console.log('Successfully mapped profile:', userProfile);
    return userProfile;
  } catch (error) {
    if (error instanceof ProfileError) {
      throw error;
    }
    console.error('Unexpected error in profile management:', error);
    throw new ProfileError('Unexpected error fetching profile', 'unknown');
  }
}

export { fetchProfile, ProfileError };
