import { supabase } from "@/integrations/supabase/client";
import { UserProfile, UserRole, SubscriptionPlan } from "@/types/auth";
import { PostgrestError, PostgrestSingleResponse } from "@supabase/supabase-js";

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

interface ProfileResponse {
  created_at: string;
  updated_at: string;
  full_name: string | null;
  avatar_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_line3: string | null;
  locality: string | null;
  administrative_area: string | null;
  postal_code: string | null;
  country_id: string | null;
  address_format: string | null;
  plan: string | null;
  search_count: number | null;
  notification_preferences: {
    travel_alerts: boolean;
    policy_changes: boolean;
    documentation_reminders: boolean;
  } | null;
}

// Helper function to create a query with its own timeout
const executeQueryWithTimeout = async <T>(
  queryPromise: Promise<PostgrestSingleResponse<T>>,
  queryName: string
): Promise<PostgrestSingleResponse<T>> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new ProfileError(`${queryName} query timed out`, 'timeout'));
    }, QUERY_TIMEOUT);
  });

  return Promise.race([queryPromise, timeoutPromise]);
};

// Helper to validate role
const validateRole = (role: string): UserRole => {
  const validRoles: UserRole[] = ['pet_lover', 'site_manager', 'pet_caddie'];
  return validRoles.includes(role as UserRole) ? (role as UserRole) : 'pet_caddie';
};

// Helper to validate subscription plan
const validatePlan = (plan: string | null): SubscriptionPlan | undefined => {
  const validPlans: SubscriptionPlan[] = ['free', 'premium', 'teams'];
  return plan && validPlans.includes(plan as SubscriptionPlan) ? (plan as SubscriptionPlan) : undefined;
};

async function fetchProfile(userId: string): Promise<UserProfile> {
  console.log('Fetching profile for user:', userId);
  
  try {
    // Get profile and role data in parallel
    const [profileResult, roleResult] = await Promise.all([
      executeQueryWithTimeout<ProfileResponse>(
        Promise.resolve(
          supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle()
        ),
        'Profile'
      ),
      executeQueryWithTimeout<{ role: string }>(
        Promise.resolve(
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle()
        ),
        'Role'
      )
    ]);

    if (profileResult.error) {
      console.error('Error fetching profile:', profileResult.error);
      throw new ProfileError('Failed to fetch user profile', 'network');
    }

    if (!profileResult.data) {
      console.error('No profile found for user');
      throw new ProfileError('User profile not found', 'not_found');
    }

    if (roleResult.error) {
      console.error('Error fetching role:', roleResult.error);
      throw new ProfileError('Failed to fetch user role', 'network');
    }

    // Create the user profile object
    const userProfile: UserProfile = {
      id: userId,
      userRole: validateRole(roleResult.data?.role || 'pet_caddie'),
      created_at: profileResult.data.created_at,
      updated_at: profileResult.data.updated_at,
      full_name: profileResult.data.full_name ?? undefined,
      avatar_url: profileResult.data.avatar_url ?? undefined,
      address_line1: profileResult.data.address_line1 ?? undefined,
      address_line2: profileResult.data.address_line2 ?? undefined,
      address_line3: profileResult.data.address_line3 ?? undefined,
      locality: profileResult.data.locality ?? undefined,
      administrative_area: profileResult.data.administrative_area ?? undefined,
      postal_code: profileResult.data.postal_code ?? undefined,
      country_id: profileResult.data.country_id ?? undefined,
      address_format: profileResult.data.address_format ?? undefined,
      plan: validatePlan(profileResult.data.plan),
      search_count: profileResult.data.search_count ?? undefined,
      notification_preferences: profileResult.data.notification_preferences
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
