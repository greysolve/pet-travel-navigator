
import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/types/auth";
import { toast } from "@/components/ui/use-toast";

export async function fetchOrCreateProfile(userId: string): Promise<UserProfile | null> {
  try {
    console.log('Fetching profile for user:', userId);
    
    // Fetch profile with role in a single query using a join with the new structure
    const { data: profileWithRole, error: fetchError } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles (
          role
        )
      `)
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      throw fetchError;
    }

    if (profileWithRole) {
      console.log('Fetched existing profile with role:', profileWithRole);
      // Transform the data to match UserProfile interface
      const profile: UserProfile = {
        ...profileWithRole,
        userRole: profileWithRole.user_roles?.[0]?.role // Access first role since we now have an array
      };
      return profile;
    }

    return await createNewProfile(userId);
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

async function createNewProfile(userId: string): Promise<UserProfile | null> {
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
    .select(`
      *,
      user_roles (
        role
      )
    `)
    .maybeSingle();

  if (insertError) {
    if (insertError.code === '23505') {
      return await handleDuplicateProfile(userId);
    }
    console.error('Error creating profile:', insertError);
    throw insertError;
  }

  if (newProfile) {
    console.log('Created new profile:', newProfile);
    // Transform the data to match UserProfile interface
    const profile: UserProfile = {
      ...newProfile,
      userRole: newProfile.user_roles?.[0]?.role // Access first role since we now have an array
    };
    return profile;
  }
  
  return null;
}

async function handleDuplicateProfile(userId: string): Promise<UserProfile | null> {
  console.log('Profile already exists (race condition), fetching it...');
  const { data: retryProfile, error: retryError } = await supabase
    .from('profiles')
    .select(`
      *,
      user_roles (
        role
      )
    `)
    .eq('id', userId)
    .maybeSingle();

  if (retryError) throw retryError;
  if (retryProfile) {
    console.log('Successfully fetched profile after retry:', retryProfile);
    // Transform the data to match UserProfile interface
    const profile: UserProfile = {
      ...retryProfile,
      userRole: retryProfile.user_roles?.[0]?.role // Access first role since we now have an array
    };
    return profile;
  }
  return null;
}
