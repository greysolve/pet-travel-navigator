
import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/types/auth";
import { toast } from "@/components/ui/use-toast";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchProfileWithRetry(userId: string, retryCount = 0): Promise<UserProfile | null> {
  try {
    console.log(`Attempting to fetch profile for user ${userId}, attempt ${retryCount + 1}`);
    
    // First, fetch user role directly from user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      throw roleError;
    }

    // Then fetch profile separately
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw profileError;
    }

    if (!profileData) {
      console.log('Profile not found');
      return null;
    }

    console.log('Profile data:', profileData);
    console.log('Role data:', roleData);

    // Use role from separate query, default to pet_caddie if not found
    const userRole = roleData?.role || 'pet_caddie';
    console.log('Using role:', userRole);
    
    // Create a clean UserProfile object with explicit mapping
    const mappedProfile: UserProfile = {
      id: profileData.id,
      userRole: userRole,
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
      notification_preferences: profileData.notification_preferences
    };
    
    console.log('Mapped profile:', mappedProfile);
    return mappedProfile;
  } catch (error) {
    console.error('Error in fetchProfileWithRetry:', error);
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      await wait(INITIAL_RETRY_DELAY * Math.pow(2, retryCount));
      return fetchProfileWithRetry(userId, retryCount + 1);
    }
    // Return a default profile with pet_caddie role
    return {
      id: userId,
      userRole: 'pet_caddie',
      search_count: 5,
      notification_preferences: {
        travel_alerts: true,
        policy_changes: true,
        documentation_reminders: true
      }
    };
  }
}

export async function fetchOrCreateProfile(userId: string): Promise<UserProfile | null> {
  try {
    console.log('Starting fetchOrCreateProfile for user:', userId);
    
    // First, try to fetch existing profile
    const existingProfile = await fetchProfileWithRetry(userId);
    if (existingProfile) {
      return existingProfile;
    }

    // If no profile exists, create one
    console.log('No profile found, creating one...');
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert([{ 
        id: userId,
        notification_preferences: {
          travel_alerts: true,
          policy_changes: true,
          documentation_reminders: true
        }
      }])
      .select();

    if (insertError) {
      // Handle the case where profile was created by another concurrent request
      if (insertError.code === '23505') {
        console.log('Profile already exists (race condition), retrying fetch...');
        return await fetchProfileWithRetry(userId);
      }
      console.error('Error creating profile:', insertError);
      throw insertError;
    }

    // After creating the profile, wait briefly then fetch it with the role
    await wait(INITIAL_RETRY_DELAY);
    return await fetchProfileWithRetry(userId);
    
  } catch (error) {
    console.error('Error in profile management:', error);
    toast({
      title: "Warning",
      description: "Using default profile settings",
      variant: "default",
    });
    // Return a default profile instead of null
    return {
      id: userId,
      userRole: 'pet_caddie',
      search_count: 5,
      notification_preferences: {
        travel_alerts: true,
        policy_changes: true,
        documentation_reminders: true
      }
    };
  }
}
