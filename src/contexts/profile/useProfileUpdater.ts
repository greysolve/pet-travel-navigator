
import { useState } from 'react';
import { UserProfile } from '@/types/auth';
import { updateProfile } from '@/utils/profile/ProfileUpdater';
import { toast } from '@/components/ui/use-toast';

export interface ProfileUpdateResult {
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  isUpdating: boolean;
}

export function useProfileUpdater(
  setProfile: (profile: UserProfile | null) => void,
  setLoading: (loading: boolean) => void,
  setInitialized: (initialized: boolean) => void,
  currentUserId: React.MutableRefObject<string | null>
): ProfileUpdateResult {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    // Check if we have a user ID to update
    if (!updates.id && !currentUserId.current) {
      console.error('Cannot update profile: No profile ID or current user ID');
      return;
    }
    
    // Use either the provided ID or the current user ID
    const profileId = updates.id || currentUserId.current;
    
    if (!profileId) {
      console.error('Cannot update profile: Could not determine profile ID');
      return;
    }

    console.log('ProfileContext - Starting profile update:', {
      profileId: profileId,
      updates: updates
    });

    setIsUpdating(true);
    setLoading(true);
    
    // Create a complete profile object with the required ID
    const existingProfile = { id: profileId, ...updates };

    try {
      // Ensure we pass a valid UserProfile with required id field
      const updatedProfile = await updateProfile(profileId, updates);
      if (currentUserId.current === profileId) {
        console.log('ProfileContext - Profile updated successfully:', updatedProfile);
        setProfile(updatedProfile);
        setInitialized(true);
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      }
    } catch (error) {
      console.error('ProfileContext - Error updating profile:', error);
      
      if (currentUserId.current === profileId) {
        setProfile(existingProfile);
        setInitialized(true);
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      if (currentUserId.current === profileId) {
        setLoading(false);
      }
      setIsUpdating(false);
    }
  };

  return { updateUserProfile, isUpdating };
}
