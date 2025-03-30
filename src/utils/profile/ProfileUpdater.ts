
import { supabase } from "@/integrations/supabase/client";
import { ProfileError } from "./ProfileError";
import { UserProfile } from "@/types/auth";
import { fetchProfile } from "./ProfileFetcher";

/**
 * Updates a user profile with the given updates
 */
export async function updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  console.log('profileManagement - Starting update:', { userId, updates });
  console.log('profileManagement - Raw updates object:', JSON.stringify(updates, null, 2));

  if (!userId) {
    throw new ProfileError('User ID is required for profile update', 'not_found');
  }

  try {
    // Log entries before transformation
    console.log('profileManagement - Update entries before transformation:', Object.entries(updates));

    // Filter out undefined values and empty strings, and prepare the update object
    const updateData = Object.entries(updates).reduce((acc, [key, value]) => {
      console.log('profileManagement - Processing key:', key, 'with value:', value);
      // Only include the field if:
      // 1. It's defined (not undefined)
      // 2. It's not an empty string
      // 3. For string fields that can be null, we'll allow null values through
      if (value !== undefined && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    // Remove id and userRole from updates as they shouldn't be modified
    delete updateData.id;
    delete updateData.userRole;
    
    console.log('profileManagement - Final updateData being sent to Supabase:', updateData);
    
    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('profileManagement - Supabase update error:', error);
      throw new ProfileError(
        error.message || 'Failed to update user profile',
        error.code === 'PGRST116' ? 'not_found' : 'network'
      );
    }

    console.log('profileManagement - Update successful, fetching updated profile');
    // Fetch the updated profile
    return await fetchProfile(userId);
  } catch (error) {
    if (error instanceof ProfileError) {
      throw error;
    }
    console.error('profileManagement - Unexpected error updating profile:', error);
    throw new ProfileError('Unexpected error updating profile', 'unknown');
  }
}
