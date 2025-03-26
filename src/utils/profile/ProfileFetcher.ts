
import { supabase } from "@/integrations/supabase/client";
import { ProfileError } from "./ProfileError";
import { UserProfile, ProfileWithRoleResponse } from "./types";
import { validatePlan, validateNotificationPreferences } from "./validators";

/**
 * Fetches user profile data from the database
 */
export async function fetchProfile(userId: string): Promise<UserProfile> {
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
      userRole: data.userRole,
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
