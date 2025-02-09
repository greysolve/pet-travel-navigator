
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
    
    const { data: profileData, error: fetchError } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles!user_roles_user_id_fkey (
          role
        )
      `)
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      throw fetchError;
    }

    if (!profileData) {
      console.log('Profile not found');
      return null;
    }

    // If we have a profile but no role yet, and we haven't exceeded max retries
    if (!profileData.user_roles?.[0]?.role && retryCount < MAX_RETRIES) {
      console.log('Profile found but no role yet, retrying...');
      await wait(INITIAL_RETRY_DELAY * Math.pow(2, retryCount));
      return fetchProfileWithRetry(userId, retryCount + 1);
    }

    console.log('Successfully fetched profile with role:', profileData);
    
    // Create a clean UserProfile object with explicit mapping
    const userRole = profileData.user_roles?.[0]?.role;
    if (!userRole) {
      console.error('No role found for user after retries');
      throw new Error('No role found for user');
    }

    const mappedProfile: UserProfile = {
      id: profileData.id,
      userRole: userRole, // Explicitly set the role without fallback
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
    
    console.log('Mapped profile with explicit userRole:', mappedProfile);
    return mappedProfile;
  } catch (error) {
    console.error('Error in fetchProfileWithRetry:', error);
    throw error;
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
    // that should have been created by the database trigger
    await wait(INITIAL_RETRY_DELAY);
    return await fetchProfileWithRetry(userId);
    
  } catch (error) {
    console.error('Error in profile management:', error);
    toast({
      title: "Error",
      description: "Failed to load or create user profile",
      variant: "destructive",
    });
    return null;
  }
}
