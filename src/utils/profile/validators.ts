
import { SubscriptionPlan, UserProfile } from '@/types/auth';

/**
 * Helper to validate subscription plan
 */
export const validatePlan = (plan: string | null): SubscriptionPlan | undefined => {
  // Check if the plan is one of the valid options
  const validPlans: SubscriptionPlan[] = ['free', 'premium', 'teams', 'personal'];
  
  if (plan && validPlans.includes(plan as SubscriptionPlan)) {
    return plan as SubscriptionPlan;
  }
  
  return undefined;
};

/**
 * Helper to validate notification preferences
 */
export const validateNotificationPreferences = (preferences: unknown) => {
  const defaultPreferences = {
    travel_alerts: true,
    policy_changes: true,
    documentation_reminders: true
  };

  if (!preferences || typeof preferences !== 'object') {
    return defaultPreferences;
  }

  const prefs = preferences as Record<string, unknown>;
  
  return {
    travel_alerts: typeof prefs.travel_alerts === 'boolean' ? prefs.travel_alerts : defaultPreferences.travel_alerts,
    policy_changes: typeof prefs.policy_changes === 'boolean' ? prefs.policy_changes : defaultPreferences.policy_changes,
    documentation_reminders: typeof prefs.documentation_reminders === 'boolean' ? prefs.documentation_reminders : defaultPreferences.documentation_reminders
  };
};
