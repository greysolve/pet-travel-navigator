
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/auth';
import { toast } from '@/components/ui/use-toast';

async function fetchProfileWithRetry(userId: string): Promise<UserProfile> {
  try {
    console.log(`Fetching profile for user ${userId}`);
    
    const response = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles!inner (
          role
        )
      `)
      .eq('id', userId)
      .single();

    // Log the complete response object
    console.log('Complete Supabase Response:', {
      error: response.error,
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    
    if (response.error) {
      console.error('Error fetching profile:', response.error);
      throw response.error;
    }

    const profileData = response.data;
    
    // Log the profile data structure
    console.log('Profile Data Structure:', {
      hasUserRoles: !!profileData?.user_roles,
      userRolesType: profileData?.user_roles ? typeof profileData.user_roles : 'undefined',
      userRolesValue: profileData?.user_roles,
      directRole: profileData?.role, // Check if role exists at top level
      nestedRole: profileData?.user_roles?.role // Check nested role
    });

    if (!profileData || !profileData.user_roles || !profileData.user_roles.role) {
      console.error('Profile or role not found. Profile data:', profileData);
      throw new Error('Profile or role not found');
    }

    // Create a clean UserProfile object with explicit mapping and role validation
    const role = profileData.user_roles.role;
    
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
    
    // Log the final mapped profile validation
    console.log('Mapped Profile Validation:', {
      hasRole: !!mappedProfile.role,
      roleValue: mappedProfile.role,
      isRoleValid: ['pet_lover', 'site_manager', 'pet_caddie'].includes(mappedProfile.role)
    });

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
