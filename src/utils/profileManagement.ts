import { supabase } from "@/integrations/supabase/client";
import { UserProfile, SubscriptionPlan, UserRole, UserPermission, SystemRole, SystemPlan } from "@/types/auth";

// Interface for the direct RPC response
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
  plan: string | null;
  userRole: string;
}

// Define the class without export keyword
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
  return plan || undefined;
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

// Fetch role permissions from the database
async function fetchRolePermissions(roleName: UserRole): Promise<UserPermission[]> {
  try {
    const { data, error } = await supabase
      .from('system_roles')
      .select('permissions')
      .eq('name', roleName)
      .single();
    
    if (error) {
      console.error('Error fetching role permissions:', error);
      return [];
    }
    
    return data?.permissions || [];
  } catch (error) {
    console.error('Unexpected error fetching role permissions:', error);
    return [];
  }
}

// Fetch plan details from the database
async function fetchPlanDetails(planName: string): Promise<SystemPlan | null> {
  try {
    const { data, error } = await supabase
      .from('system_plans')
      .select('*')
      .eq('name', planName)
      .single();
    
    if (error) {
      console.error('Error fetching plan details:', error);
      return null;
    }
    
    return data as SystemPlan;
  } catch (error) {
    console.error('Unexpected error fetching plan details:', error);
    return null;
  }
}

async function updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  console.log('profileManagement - Starting update:', { userId, updates });
  console.log('profileManagement - Raw updates object:', JSON.stringify(updates, null, 2));

  if (!userId) {
    throw new ProfileError('User ID is required for profile update', 'not_found');
  }

  try {
    // Log entries before transformation
    console.log('profileManagement - Update entries before transformation:', Object.entries(updates));

    // Filter out undefined values and empty strings, and prepare the update object
    const updateData = Object.entries(updates).reduce((acc, [key, value]) => {
      console.log('profileManagement - Processing key:', key, 'with value:', value);
      // Only include the field if:
      // 1. It's defined (not undefined)
      // 2. It's not an empty string
      // 3. For string fields that can be null, we'll allow null values through
      if (value !== undefined && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    // Remove id and userRole from updates as they shouldn't be modified
    delete updateData.id;
    delete updateData.userRole;
    
    console.log('profileManagement - Final updateData being sent to Supabase:', updateData);
    
    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('profileManagement - Supabase update error:', error);
      throw new ProfileError(
        error.message || 'Failed to update user profile',
        error.code === 'PGRST116' ? 'not_found' : 'network'
      );
    }

    console.log('profileManagement - Update successful, fetching updated profile');
    // Fetch the updated profile
    return await fetchProfile(userId);
  } catch (error) {
    if (error instanceof ProfileError) {
      throw error;
    }
    console.error('profileManagement - Unexpected error updating profile:', error);
    throw new ProfileError('Unexpected error updating profile', 'unknown');
  }
}

async function fetchProfile(userId: string): Promise<UserProfile> {
  console.log('Fetching profile for user:', userId);
  
  try {
    const { data, error } = await supabase.rpc('get_profile_with_role', {
      p_user_id: userId
    });

    console.log('fetchProfile - Raw data from RPC:', data);

    if (error) {
      console.error('Error fetching profile:', error);
      throw new ProfileError('Failed to fetch user profile', 'network');
    }

    if (!data) {
      console.error('No profile data returned');
      throw new ProfileError('User profile not found', 'not_found');
    }

    // Type guard to verify the response structure
    const isValidProfileResponse = (response: any): response is ProfileWithRoleResponse => {
      return response 
        && typeof response === 'object'
        && 'id' in response
        && 'userRole' in response;
    };

    if (!isValidProfileResponse(data)) {
      console.error('Invalid response structure:', data);
      throw new ProfileError('Invalid profile data structure', 'unknown');
    }

    console.log('fetchProfile - Validated profile response:', data);

    // Create the user profile object with direct value mapping
    const userProfile: UserProfile = {
      id: userId,
      userRole: data.userRole as UserRole,
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
      search_count: data.search_count,
      notification_preferences: validateNotificationPreferences(data.notification_preferences)
    };

    console.log('fetchProfile - Mapped profile data:', userProfile);
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

// Export everything once at the bottom
export { ProfileError, fetchProfile, updateProfile, fetchRolePermissions, fetchPlanDetails };
