
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
      .maybeSingle(); // Changed from single() to maybeSingle() to prevent errors

    if (roleError) {
      console.error('Error fetching role:', roleError);
      throw new Error('Failed to fetch user role');
    }

    // If no role is found, create default role
    if (!roleData) {
      console.log('No role found, creating default role...');
      const { error: createRoleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'pet_caddie' });

      if (createRoleError) {
        console.error('Error creating default role:', createRoleError);
        throw new Error('Failed to create default user role');
      }
    }

    // Then, get the profile data - this MUST exist
    let { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // Changed from single() to maybeSingle()

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    // If no profile exists, create one with default values
    if (!profileData) {
      console.log('No profile found, creating default profile...');
      const { data: newProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert({ 
          id: userId,
          search_count: 5,
          plan: 'free',
          notification_preferences: {
            travel_alerts: true,
            policy_changes: true,
            documentation_reminders: true
          }
        })
        .select()
        .single();

      if (createProfileError || !newProfile) {
        console.error('Error creating default profile:', createProfileError);
        throw new Error('Failed to create default profile');
      }

      profileData = newProfile;
    }

    // Get the current role (either existing or newly created)
    const { data: currentRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const userRole = currentRole?.role || 'pet_caddie';

    // Parse notification preferences
    const notificationPreferences = profileData.notification_preferences as {
      travel_alerts: boolean;
      policy_changes: boolean;
      documentation_reminders: boolean;
    } | null;

    // Create the user profile object
    const userProfile: UserProfile = {
      id: userId,
      userRole,
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
    console.error('Error in fetchProfileWithRetry:', error);
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying profile fetch... (attempt ${retryCount + 1} of ${MAX_RETRIES})`);
      await wait(INITIAL_RETRY_DELAY * Math.pow(2, retryCount));
      return fetchProfileWithRetry(userId, retryCount + 1);
    }
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
    throw error;
  }
}
