
import { useState } from 'react';
import { UserProfile } from '@/types/auth';
import { updateProfile } from '@/utils/profileManagement';
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
    const profile = updates.id ? updates : null;
    
    if (!profile?.id) {
      console.error('Cannot update profile: No profile ID');
      return;
    }

    console.log('ProfileContext - Starting profile update:', {
      profileId: profile.id,
      updates: updates
    });

    setIsUpdating(true);
    setLoading(true);
    const existingProfile = profile;

    try {
      const updatedProfile = await updateProfile(profile.id, updates);
      if (currentUserId.current === profile.id) {
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
      
      if (currentUserId.current === profile.id) {
        setProfile(existingProfile);
        setInitialized(true);
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      if (currentUserId.current === profile.id) {
        setLoading(false);
      }
      setIsUpdating(false);
    }
  };

  return { updateUserProfile, isUpdating };
}
