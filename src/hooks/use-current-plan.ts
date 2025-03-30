
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SystemPlan } from "@/types/auth";

export interface PlanDetails {
  name: string;
  description: string | null;
  price: number;
  currency: string;
  features: string[];
  searchCount?: number;
  isSearchUnlimited?: boolean;
  renewsMonthly?: boolean;
}

export const useCurrentPlan = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['profile-plan'],
    queryFn: async () => {
      if (!userId) return null;

      // Get the user's profile to find their plan
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, search_count')
        .eq('id', userId)
        .maybeSingle();
      
      if (!profile) return null;

      // If user has a plan, find details from system_plans
      if (profile.plan) {
        // First get the system plan details
        const { data: systemPlan, error: systemPlanError } = await supabase
          .from('system_plans')
          .select('*')
          .eq('name', profile.plan)
          .single();

        if (systemPlanError) {
          console.error('Error fetching system plan:', systemPlanError);
          return null;
        }

        // Then get the payment plan details if available
        const { data: paymentPlans, error: paymentPlanError } = await supabase
          .from('payment_plans')
          .select('*')
          .eq('system_plan_id', systemPlan.id);

        if (paymentPlanError) {
          console.error('Error fetching payment plans:', paymentPlanError);
        }

        const paymentPlan = paymentPlans?.[0];

        // Convert features to string array, handling potential non-string values
        const features = paymentPlan?.features && Array.isArray(paymentPlan.features) 
          ? paymentPlan.features.map(feature => String(feature))
          : [];

        return {
          name: systemPlan.name,
          description: systemPlan.description,
          price: paymentPlan?.price || 0,
          currency: paymentPlan?.currency || 'USD',
          features,
          searchCount: profile.search_count,
          isSearchUnlimited: systemPlan.is_search_unlimited,
          renewsMonthly: systemPlan.renews_monthly
        } satisfies PlanDetails;
      }

      // Default free plan
      const { data: freePlan } = await supabase
        .from('system_plans')
        .select('*')
        .eq('name', 'free')
        .single();

      return {
        name: "Free Plan",
        description: freePlan?.description || null,
        price: 0,
        currency: "USD",
        features: [],
        searchCount: profile.search_count ?? 5,
        isSearchUnlimited: false,
        renewsMonthly: false
      } satisfies PlanDetails;
    },
    enabled: !!userId
  });
};
