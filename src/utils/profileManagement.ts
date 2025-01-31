import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/types/auth";
import { toast } from "@/components/ui/use-toast";

export async function fetchOrCreateProfile(userId: string): Promise<UserProfile | null> {
  try {
    console.log('Fetching profile for user:', userId);
    
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      throw fetchError;
    }

    if (existingProfile) {
      console.log('Fetched existing profile:', existingProfile);
      return existingProfile;
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
    .select()
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
    return newProfile;
  }
  
  return null;
}

async function handleDuplicateProfile(userId: string): Promise<UserProfile | null> {
  console.log('Profile already exists (race condition), fetching it...');
  const { data: retryProfile, error: retryError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (retryError) throw retryError;
  if (retryProfile) {
    console.log('Successfully fetched profile after retry:', retryProfile);
    return retryProfile;
  }
  return null;
}