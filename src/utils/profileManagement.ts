
import { supabase } from "@/integrations/supabase/client";
import { UserProfile, SubscriptionPlan } from "@/types/auth";

class ProfileError extends Error {
  constructor(
    message: string,
    public readonly type: 'not_found' | 'network' | 'unknown'
  ) {
    super(message);
    this.name = 'ProfileError';
  }
}

// Helper to validate subscription plan
const validatePlan = (plan: string | null): SubscriptionPlan | undefined => {
  const validPlans: SubscriptionPlan[] = ['free', 'premium', 'teams'];
  return plan && validPlans.includes(plan as SubscriptionPlan) ? (plan as SubscriptionPlan) : undefined;
};

// Helper to validate notification preferences
const validateNotificationPreferences = (preferences: unknown) => {
  const defaultPreferences = {
    travel_alerts: true,
    policy_changes: true,
    documentation_reminders: true
  };

  if (!preferences || typeof preferences !== 'object') {
    return defaultPreferences;
  }

  const prefs = preferences as Record<string, unknown>;
  
  return {
    travel_alerts: typeof prefs.travel_alerts === 'boolean' ? prefs.travel_alerts : defaultPreferences.travel_alerts,
    policy_changes: typeof prefs.policy_changes === 'boolean' ? prefs.policy_changes : defaultPreferences.policy_changes,
    documentation_reminders: typeof prefs.documentation_reminders === 'boolean' ? prefs.documentation_reminders : defaultPreferences.documentation_reminders
  };
};

async function fetchProfile(userId: string): Promise<UserProfile> {
  console.log('Fetching profile for user:', userId);
  
  try {
    // Set a timeout for the function call
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new ProfileError('Profile fetch timeout', 'network')), 10000);
    });

    const fetchPromise = supabase.rpc('get_profile_with_role', {
      p_user_id: userId
    });

    // Race between the fetch and the timeout
    const { data, error } = await Promise.race([
      fetchPromise,
      timeoutPromise
    ]) as any;

    if (error) {
      console.error('Error fetching profile:', error);
      throw new ProfileError('Failed to fetch user profile', 'network');
    }

    if (!data) {
      console.error('No profile found for user');
      throw new ProfileError('User profile not found', 'not_found');
    }

    // Create the user profile object with the flat structure
    const userProfile: UserProfile = {
      id: userId,
      userRole: data.userRole || 'pet_caddie',
      created_at: data.created_at,
      updated_at: data.updated_at,
      full_name: data.full_name ?? undefined,
      avatar_url: data.avatar_url ?? undefined,
      address_line1: data.address_line1 ?? undefined,
      address_line2: data.address_line2 ?? undefined,
      address_line3: data.address_line3 ?? undefined,
      locality: data.locality ?? undefined,
      administrative_area: data.administrative_area ?? undefined,
      postal_code: data.postal_code ?? undefined,
      country_id: data.country_id ?? undefined,
      address_format: data.address_format ?? undefined,
      plan: validatePlan(data.plan),
      search_count: data.search_count ?? undefined,
      notification_preferences: validateNotificationPreferences(data.notification_preferences)
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
