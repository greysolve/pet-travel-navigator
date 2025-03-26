
// Re-export the types from the context to maintain consistency
import type { SystemRole, SystemPlan } from '@/contexts/SystemConfigContext';

export type { SystemRole, SystemPlan };

// These types are now just string type aliases that will be validated at runtime
export type UserRole = string;
export type SubscriptionPlan = string;

export interface UserProfile {
  id: string;
  created_at?: string;
  updated_at?: string;
  full_name?: string;
  avatar_url?: string | null;
  userRole?: UserRole;
  search_count?: number;
  plan?: SubscriptionPlan;
  notification_preferences?: {
    travel_alerts?: boolean;
    policy_changes?: boolean;
    documentation_reminders?: boolean;
  };
  address_line1?: string;
  address_line2?: string;
  address_line3?: string;
  locality?: string;
  administrative_area?: string;
  postal_code?: string;
  country_id?: string;
  address_format?: string;
}
