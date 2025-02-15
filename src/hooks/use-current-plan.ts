
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlanDetails {
  name: string;
  description: string | null;
  price: number;
  currency: string;
  features: string[];
  searchCount?: number;
}

export const useCurrentPlan = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['profile-plan'],
    queryFn: async () => {
      if (!userId) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, search_count')
        .eq('id', userId)
        .maybeSingle();
      
      if (!profile) return null;

      if (profile.plan) {
        const { data: plans } = await supabase
          .from('payment_plans')
          .select('*')
          .ilike('name', `%${profile.plan}%`);

        const planDetails = plans?.[0];
        if (planDetails) {
          return {
            ...planDetails,
            searchCount: profile.search_count,
            features: Array.isArray(planDetails.features) ? planDetails.features : []
          };
        }
      }

      return {
        name: "Free Plan",
        description: null,
        price: 0,
        currency: "USD",
        features: [],
        searchCount: profile.search_count ?? 5
      };
    },
    enabled: !!userId
  });
};
