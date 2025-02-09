
import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/types/auth";
import { toast } from "@/components/ui/use-toast";

async function fetchProfileWithRetry(userId: string): Promise<UserProfile | null> {
  try {
    console.log(`Fetching profile for user ${userId}`);
    
    // Updated query to use the correct relationship pattern
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles!profiles_user_role_id_fkey (
          role
        )
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }

    if (!profileData) {
      console.log('Profile not found');
      return null;
    }

    console.log('Profile data:', profileData);
    
    // Create a clean UserProfile object with explicit mapping
    const mappedProfile: UserProfile = {
      id: profileData.id,
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
      notification_preferences: profileData.notification_preferences,
      user_roles: profileData.user_roles
    };
    
    console.log('Mapped profile:', mappedProfile);
    return mappedProfile;
  } catch (error) {
    console.error('Error in fetchProfileWithRetry:', error);
    throw error;
  }
}

export async function fetchOrCreateProfile(userId: string): Promise<UserProfile | null> {
  try {
    console.log('Starting fetchOrCreateProfile for user:', userId);
    
    // Try to fetch existing profile
    const existingProfile = await fetchProfileWithRetry(userId);
    if (existingProfile) {
      return existingProfile;
    }

    // If no profile exists, we should not create one manually
    // The profile should have been created by the trigger
    console.error('No profile found for user:', userId);
    toast({
      title: "Authentication Error",
      description: "Your profile could not be loaded. Please try logging in again.",
      variant: "destructive",
    });
    return null;
    
  } catch (error) {
    console.error('Error in profile management:', error);
    toast({
      title: "Authentication Error",
      description: "There was an error loading your profile. Please try logging in again.",
      variant: "destructive",
    });
    return null;
  }
}
