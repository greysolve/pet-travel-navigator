
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/auth';
import { toast } from '@/components/ui/use-toast';

async function fetchProfileWithRetry(userId: string): Promise<UserProfile> {
  try {
    console.log(`Fetching profile for user ${userId}`);
    
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles!inner (
          role
        )
      `)
      .eq('id', userId)
      .maybeSingle();  // Changed from single() to maybeSingle()

    if (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }

    if (!profileData || !profileData.user_roles?.role) {
      console.log('Profile or role not found, waiting for creation...');
      // Wait a bit before retrying to allow the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchProfileWithRetry(userId);
    }

    console.log('Profile data:', profileData);
    
    // Create a clean UserProfile object with explicit mapping and role validation
    const role = profileData.user_roles.role;
    if (role !== 'pet_lover' && role !== 'site_manager' && role !== 'pet_caddie') {
      throw new Error(`Invalid role: ${role}`);
    }

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
      role: role
    };
    
    console.log('Mapped profile:', mappedProfile);
    return mappedProfile;
  } catch (error) {
    console.error('Error in fetchProfileWithRetry:', error);
    throw error;
  }
}

export async function fetchOrCreateProfile(userId: string): Promise<UserProfile> {
  try {
    console.log('Starting fetchOrCreateProfile for user:', userId);
    
    const profile = await fetchProfileWithRetry(userId);
    if (!profile || !profile.role) {
      throw new Error('Invalid profile or missing role');
    }

    return profile;
    
  } catch (error) {
    console.error('Error in profile management:', error);
    throw error;
  }
}
