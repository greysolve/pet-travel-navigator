
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSystemConfig } from "@/contexts/SystemConfigContext";
import { useToast } from "@/hooks/use-toast";
import type { SystemPlan } from "@/types/auth";
import type { Database } from "@/integrations/supabase/types";

export const usePlanDetails = (planName: string | undefined) => {
  const [planDetails, setPlanDetails] = useState<SystemPlan | null>(null);
  const { toast } = useToast();
  const { plans } = useSystemConfig();

  useEffect(() => {
    const fetchPlanDetails = async () => {
      if (!planName) return;

      try {
        const planFromContext = plans.find(p => p.name === planName);
        
        if (planFromContext) {
          setPlanDetails(planFromContext);
          return;
        }

        // Cast the string to the subscription_plan enum type for the database query
        const planNameEnum = planName as Database["public"]["Enums"]["subscription_plan"];
        
        const { data, error } = await supabase
          .from('system_plans')
          .select('*')
          .eq('name', planNameEnum)
          .single();

        if (error) {
          console.error("Error fetching plan details:", error);
          toast({
            title: "Error",
            description: "Could not fetch plan details",
            variant: "destructive",
          });
          return;
        }

        setPlanDetails(data as SystemPlan);
      } catch (error) {
        console.error("Unexpected error fetching plan details:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred fetching plan details",
          variant: "destructive",
        });
      }
    };

    if (planName) {
      fetchPlanDetails();
    }
  }, [planName, plans, toast]);

  return { planDetails };
};
