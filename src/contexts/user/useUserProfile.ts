
import { ProfileError } from '@/utils/profile/ProfileError';
import { fetchProfile } from '@/utils/profile/ProfileFetcher';
import { UserAction } from './UserState';

/**
 * Function to load user profile
 */
export async function loadUserProfile(
  userId: string,
  dispatch: React.Dispatch<UserAction>
) {
  if (!userId) return;
  
  console.log('UserContext - Loading profile for user:', userId);
  dispatch({ type: 'PROFILE_LOADING_START', payload: { userId } });
  
  try {
    const profile = await fetchProfile(userId);
    console.log('UserContext - Profile loaded successfully:', profile);
    
    dispatch({
      type: 'PROFILE_LOADING_SUCCESS',
      payload: { profile },
    });
  } catch (error) {
    console.error('UserContext - Error loading profile:', error);
    
    const profileError = error instanceof ProfileError
      ? error
      : new ProfileError('Failed to load user profile', 'unknown');
    
    dispatch({
      type: 'PROFILE_LOADING_ERROR',
      payload: profileError,
    });
  }
}

/**
 * Functions for profile management
 */
export const profileOperations = {
  /**
   * Function to refresh profile data
   */
  createRefreshProfile: (
    user: any,
    dispatch: React.Dispatch<UserAction>
  ) => async () => {
    if (!user) {
      console.log('UserContext - Cannot refresh profile: No authenticated user');
      return;
    }
    
    await loadUserProfile(user.id, dispatch);
  },
  
  /**
   * Function to update profile
   */
  createUpdateProfile: (
    user: any,
    profile: any,
    dispatch: React.Dispatch<UserAction>
  ) => async (updates: any) => {
    if (!user || !profile) {
      console.error('UserContext - Cannot update profile: No authenticated user or profile');
      throw new ProfileError('Cannot update profile without authentication', 'unknown');
    }
    
    dispatch({ type: 'PROFILE_LOADING_START', payload: { userId: user.id } });
    
    try {
      const { updateProfile } = await import('@/utils/profile/ProfileUpdater');
      const updatedProfile = await updateProfile(user.id, updates);
      
      dispatch({
        type: 'PROFILE_UPDATE',
        payload: { profile: updatedProfile },
      });
    } catch (error) {
      console.error('UserContext - Error updating profile:', error);
      
      const profileError = error instanceof ProfileError
        ? error
        : new ProfileError('Failed to update user profile', 'unknown');
      
      dispatch({
        type: 'PROFILE_LOADING_ERROR',
        payload: profileError,
      });
      
      throw profileError;
    }
  }
};
