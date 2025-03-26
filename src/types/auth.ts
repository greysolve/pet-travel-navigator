
export type UserRole = 'pet_lover' | 'site_manager' | 'pet_caddie';

export type SubscriptionPlan = 'free' | 'premium' | 'teams' | 'personal';

export type UserPermission = 'view_all_fields' | 'view_restricted_fields';

export interface SystemRole {
  id: string;
  name: UserRole;
  description?: string;
  permissions: UserPermission[];
}

export interface SystemPlan {
  id: string;
  name: SubscriptionPlan;
  description?: string;
  search_limit: number;
  is_search_unlimited: boolean;
  renews_monthly: boolean;
}

export interface UserProfile {
  id: string;
  user_id?: string;
  userRole: UserRole; // No longer optional
  created_at?: string;
  updated_at?: string;
  full_name?: string;
  avatar_url?: string;
  address_line1?: string;
  address_line2?: string;
  address_line3?: string;
  locality?: string;
  administrative_area?: string;
  postal_code?: string;
  country_id?: string;
  address_format?: string;
  plan?: SubscriptionPlan;
  search_count: number; // No longer optional
  notification_preferences?: {
    travel_alerts: boolean;
    policy_changes: boolean;
    documentation_reminders: boolean;
  } | null;
}
