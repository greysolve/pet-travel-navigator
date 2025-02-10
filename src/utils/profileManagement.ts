
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/auth';
import { toast } from '@/components/ui/use-toast';
import { hasData } from '@/types/supabase'; 

async function fetchProfileWithRetry(userId: string, retryCount = 3): Promise<UserProfile> {
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      console.log(`Fetching profile for user ${userId} - Attempt ${attempt}`);
      
      const response = await supabase
        .from('profiles')
        .select(`
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
        `)
        .eq('id', userId)
        .single();

      if (response.error) {
        console.error(`Error fetching profile attempt ${attempt}:`, response.error);
        if (attempt === retryCount) throw response.error;
        continue;
      }

      // Get user role in a separate query
      const roleResponse = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleResponse.error) {
        console.error(`Error fetching role attempt ${attempt}:`, roleResponse.error);
        if (attempt === retryCount) throw roleResponse.error;
        continue;
      }

      const profileData = response.data;
      const role = roleResponse.data.role;

      if (!profileData || !role) {
        console.error('Profile or role not found. Profile data:', profileData);
        throw new Error('Profile or role not found');
      }
      
      // Log role details before validation
      console.log('Role Details:', {
        rawRole: role,
        roleType: typeof role,
        validRoles: ['pet_lover', 'site_manager', 'pet_caddie']
      });

      if (role !== 'pet_lover' && role !== 'site_manager' && role !== 'pet_caddie') {
        console.error('Invalid role detected:', role);
        throw new Error(`Invalid role: ${role}`);
      }

      const mappedProfile: UserProfile = {
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
