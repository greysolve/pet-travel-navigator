
import { supabase } from "@/integrations/supabase/client";
import { ProfileError } from "./ProfileError";
import { UserProfile } from "@/types/auth";

/**
 * Fetches user profile data from the database
 */
export async function fetchProfile(userId: string): Promise<UserProfile> {
  console.log('ProfileFetcher: Fetching profile for user:', userId);
  
  try {
    // First attempt to use RPC function which should be faster
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_profile_with_role', {
      p_user_id: userId
    });

    console.log('ProfileFetcher - RPC response:', { data: rpcData, error: rpcError });

    if (rpcError) {
      console.warn('ProfileFetcher: RPC method failed, falling back to direct profile query:', rpcError);
      
      // Fall back to direct query to profiles and user_roles tables
      const [profileResult, roleResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId).single()
      ]);
      
      console.log('ProfileFetcher - Fallback queries:', { 
        profile: profileResult.data, 
        profileError: profileResult.error,
        role: roleResult.data,
        roleError: roleResult.error
      });
      
      if (profileResult.error) {
        throw new ProfileError(`Failed to fetch profile: ${profileResult.error.message}`, 'network');
      }
      
      if (!profileResult.data) {
        throw new ProfileError('User profile not found', 'not_found');
      }
      
      // Create profile from direct queries
      const profileData = profileResult.data;
      const userRole = roleResult.data?.role || 'pet_caddie';
      
      const userProfile: UserProfile = {
        id: userId,
        userRole,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
        full_name: profileData.full_name || undefined,
        avatar_url: profileData.avatar_url || undefined,
        address_line1: profileData.address_line1 || undefined,
        address_line2: profileData.address_line2 || undefined,
        address_line3: profileData.address_line3 || undefined,
        locality: profileData.locality || undefined,
        administrative_area: profileData.administrative_area || undefined,
        postal_code: profileData.postal_code || undefined,
        country_id: profileData.country_id || undefined,
        address_format: profileData.address_format || undefined,
        plan: profileData.plan || 'free',
        search_count: profileData.search_count || 5,
        notification_preferences: profileData.notification_preferences || {
          travel_alerts: true,
          policy_changes: true,
          documentation_reminders: true
        }
      };
      
      console.log('ProfileFetcher: Created profile from direct queries:', userProfile);
      return userProfile;
    }

    if (!rpcData) {
      throw new ProfileError('User profile not found in RPC response', 'not_found');
    }
    
    // Map the RPC response to UserProfile
    const userProfile: UserProfile = {
      id: userId,
      userRole: rpcData.userRole || 'pet_caddie',
      created_at: rpcData.created_at,
      updated_at: rpcData.updated_at,
      full_name: rpcData.full_name || undefined,
      avatar_url: rpcData.avatar_url || undefined,
      address_line1: rpcData.address_line1 || undefined,
      address_line2: rpcData.address_line2 || undefined,
      address_line3: rpcData.address_line3 || undefined,
      locality: rpcData.locality || undefined,
      administrative_area: rpcData.administrative_area || undefined,
      postal_code: rpcData.postal_code || undefined,
      country_id: rpcData.country_id || undefined,
      address_format: rpcData.address_format || undefined,
      plan: rpcData.plan || 'free',
      search_count: rpcData.search_count || 5,
      notification_preferences: rpcData.notification_preferences || {
        travel_alerts: true,
        policy_changes: true,
        documentation_reminders: true
      }
    };

    console.log('ProfileFetcher: Successfully fetched profile from RPC:', userProfile);
    return userProfile;
  } catch (error) {
    if (error instanceof ProfileError) {
      throw error;
    }
    console.error('ProfileFetcher: Unexpected error:', error);
    throw new ProfileError('Unexpected error fetching profile', 'unknown');
  }
}
