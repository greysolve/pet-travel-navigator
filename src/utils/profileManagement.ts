
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/auth';
import { toast } from '@/components/ui/use-toast';
import { Tables, hasData, handleQueryResult } from '@/types/supabase';
import { AppRole } from '@/types/auth';

async function fetchProfileWithRetry(userId: string, retryCount = 3): Promise<UserProfile> {
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      console.log(`Fetching profile for user ${userId} - Attempt ${attempt}`);
      
      const result = await supabase
        .from('user_roles')
        .select(`
          role,
          profiles!user_roles_user_id_fkey (
            id,
            created_at,
            updated_at,
            full_name,
            avatar_url,
            address_line1,
            address_line2,
            address_line3,
            locality,
            administrative_area,
            postal_code,
            country_id,
            address_format,
            plan,
            search_count,
            notification_preferences
          )
        `)
        .eq('user_id', userId)
        .single();

      if (result.error) {
        console.error(`Error fetching profile attempt ${attempt}:`, result.error);
        if (attempt === retryCount) throw result.error;
        continue;
      }

      if (!result.data || !result.data.profiles || !result.data.role) {
        console.error('Profile or role not found. Response data:', result.data);
        throw new Error('Profile or role not found');
      }
      
      const role = result.data.role as AppRole;
      
      // Log role details before validation
      console.log('Role Details:', {
        rawRole: role,
        roleType: typeof role,
        validRoles: ['pet_lover', 'site_manager', 'pet_caddie']
      });

      if (role !== 'pet_lover' && 
          role !== 'site_manager' && 
          role !== 'pet_caddie') {
        console.error('Invalid role detected:', role);
        throw new Error(`Invalid role: ${role}`);
      }

      const profileData = result.data.profiles;

      const mappedProfile: UserProfile = {
        id: profileData.id,
        ...profileData,
        role
      };
      
      // Log the final mapped profile validation
      console.log('Mapped Profile Validation:', {
        hasRole: !!mappedProfile.role,
        roleValue: mappedProfile.role,
        isRoleValid: ['pet_lover', 'site_manager', 'pet_caddie'].includes(mappedProfile.role)
      });

      return mappedProfile;
    } catch (error) {
      console.error(`Error in fetchProfileWithRetry attempt ${attempt}:`, error);
      if (attempt === retryCount) throw error;
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  throw new Error('Failed to fetch profile after all retry attempts');
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
    toast({
      title: "Error loading profile",
      description: "Please try refreshing the page",
      variant: "destructive",
    });
    throw error;
  }
}
