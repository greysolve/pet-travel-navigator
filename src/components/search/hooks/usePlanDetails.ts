
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSystemConfig } from "@/contexts/SystemConfigContext";
import { useToast } from "@/hooks/use-toast";

export const usePlanDetails = (planName: string | undefined) => {
  const [planDetails, setPlanDetails] = useState<any | null>(null);
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

        const { data, error } = await supabase
          .from('system_plans')
          .select('*')
          .eq('name', planName)
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

        setPlanDetails(data);
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
