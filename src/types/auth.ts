export type UserRole = 'pet_lover' | 'site_manager';

export interface UserProfile {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  full_name?: string;
  avatar_url?: string;
}