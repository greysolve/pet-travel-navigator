
export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  plan: string;
  first_name: string;
  last_name: string;
  stripe_customer_id?: string | null;
  password_set?: boolean;
}

export interface UpdateUserData {
  id: string;
  first_name?: string;
  last_name?: string;
  role?: 'pet_lover' | 'pet_caddie' | 'site_manager';
  plan?: 'free' | 'premium' | 'teams' | 'personal';
}
