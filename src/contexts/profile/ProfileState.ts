
import { UserProfile } from '@/types/auth';
import { ProfileError } from '@/utils/profile/ProfileError';

export interface ProfileState {
  profile: UserProfile | null;
  loading: boolean;
  error: ProfileError | null;
  initialized: boolean;
}

export const initialProfileState: ProfileState = {
  profile: null,
  loading: true,
  error: null,
  initialized: false
};
