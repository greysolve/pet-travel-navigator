
import { supabase } from "@/integrations/supabase/client";

export interface StripeCheckoutResponse {
  sessionId: string;
  url: string;
}

export interface StripePortalResponse {
  url: string;
}

type StripeEnvironment = 'test' | 'production';

export const stripeApi = {
  createCheckoutSession: async (userId: string, priceId: string, environment: StripeEnvironment = 'test'): Promise<StripeCheckoutResponse> => {
    const { data, error } = await supabase.functions.invoke('stripe', {
      body: {
        action: 'create-subscription',
        userId,
        priceId,
        environment
      }
    });

    if (error) throw new Error(error.message);
    return data;
  },

  redirectToCustomerPortal: async (userId: string, environment: StripeEnvironment = 'test'): Promise<StripePortalResponse> => {
    const { data, error } = await supabase.functions.invoke('stripe', {
      body: {
        action: 'portal',
        userId,
        environment
      }
    });

    if (error) throw new Error(error.message);
    return data;
  },

  importPlans: async (environment: StripeEnvironment = 'test'): Promise<{ success: boolean; message: string }> => {
    const { data, error } = await supabase.functions.invoke('stripe', {
      body: {
        action: 'import-plans',
        environment
      }
    });

    if (error) throw new Error(error.message);
    return data;
  }
};
