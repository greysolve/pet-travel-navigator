
import { supabase } from "@/integrations/supabase/client";
import { UserProfile, SubscriptionPlan, UserRole } from "@/types/auth";

// Interface to type the exact response from get_profile_with_role function
interface ProfileWithRoleResponse {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  notification_preferences: {
    travel_alerts: boolean;
    policy_changes: boolean;
    documentation_reminders: boolean;
  } | null;
  created_at: string;
  updated_at: string;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  locality: string | null;
  administrative_area: string | null;
  postal_code: string | null;
  address_format: string | null;
  country_id: string | null;
  search_count: number;
  plan: SubscriptionPlan | null;
  userRole: string;
}

// Interface for the RPC response wrapper
interface ProfileRPCResponse {
  get_profile_with_role: ProfileWithRoleResponse;
}

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
    const { data, error } = await supabase.rpc('get_profile_with_role', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error fetching profile:', error);
      throw new ProfileError('Failed to fetch user profile', 'network');
    }

    if (!data) {
      console.error('No profile data returned');
      throw new ProfileError('User profile not found', 'not_found');
    }

    // Type guard to verify the response structure
    const isProfileResponse = (response: any): response is ProfileRPCResponse => {
      return response && typeof response === 'object' && 'get_profile_with_role' in response;
    };

    if (!isProfileResponse(data)) {
      console.error('Invalid response structure:', data);
      throw new ProfileError('Invalid profile data structure', 'unknown');
    }

    const profileData = data.get_profile_with_role;

    // Create the user profile object with direct value mapping
    const userProfile: UserProfile = {
      id: userId,
      userRole: profileData.userRole as UserRole,
      created_at: profileData.created_at,
      updated_at: profileData.updated_at,
      full_name: profileData.full_name ?? undefined,
      avatar_url: profileData.avatar_url ?? undefined,
      address_line1: profileData.address_line1 ?? undefined,
      address_line2: profileData.address_line2 ?? undefined,
      address_line3: profileData.address_line3 ?? undefined,
      locality: profileData.locality ?? undefined,
      administrative_area: profileData.administrative_area ?? undefined,
      postal_code: profileData.postal_code ?? undefined,
      country_id: profileData.country_id ?? undefined,
      address_format: profileData.address_format ?? undefined,
      plan: validatePlan(profileData.plan),
      search_count: profileData.search_count,
      notification_preferences: validateNotificationPreferences(profileData.notification_preferences)
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

