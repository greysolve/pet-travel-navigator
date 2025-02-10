
import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "@/types/auth";
import { toast } from "@/components/ui/use-toast";

async function fetchProfile(userId: string): Promise<UserProfile> {
  console.log('Fetching profile for user:', userId);
  
  // Get the user's role - this MUST exist due to the signup trigger
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (roleError) {
    console.error('Error fetching role:', roleError);
    throw new Error('Failed to fetch user role - signup trigger may have failed');
  }

  // Get the profile data - this MUST exist due to the signup trigger
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    throw new Error('Failed to fetch user profile - signup trigger may have failed');
  }

  // Parse notification preferences
  const notificationPreferences = profileData.notification_preferences as {
    travel_alerts: boolean;
    policy_changes: boolean;
    documentation_reminders: boolean;
  } | null;

  // Create the user profile object
  const userProfile: UserProfile = {
    id: userId,
    userRole: roleData.role,
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
}

export async function fetchOrCreateProfile(userId: string): Promise<UserProfile> {
  try {
    console.log('Starting fetchOrCreateProfile for user:', userId);
    return await fetchProfile(userId);
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
