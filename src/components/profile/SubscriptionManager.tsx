
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Infinity } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import type { SystemPlan } from "@/types/auth";

export function SubscriptionManager({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useProfile();

  const { data: currentPlan } = useQuery({
    queryKey: ['profile-plan'],
    queryFn: async () => {
      // First get the user's profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('plan, search_count')
        .eq('id', userId)
        .maybeSingle();
      
      if (!profileData) return null;

      // If user has a plan, find it in system_plans
      if (profileData.plan) {
        const { data: systemPlan } = await supabase
          .from('system_plans')
          .select('*')
          .eq('name', profileData.plan)
          .single();

        if (systemPlan) {
          // Now get the payment plan details if they exist
          const { data: paymentPlans } = await supabase
            .from('payment_plans')
            .select('*')
            .eq('system_plan_id', systemPlan.id);

          const paymentPlan = paymentPlans?.[0];
          
          return {
            systemPlan,
            paymentPlan,
            searchCount: profileData.search_count
          };
        }
      }

      // Return basic free plan info if no plan found
      const { data: freePlan } = await supabase
        .from('system_plans')
        .select('*')
        .eq('name', 'free')
        .single();

      return {
        systemPlan: freePlan || {
          name: "free",
          search_limit: 5,
          is_search_unlimited: false,
          renews_monthly: false
        },
        paymentPlan: null,
        searchCount: profileData.search_count ?? 5
      };
    },
  });

  const handleManageSubscription = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'portal',
          userId 
        }),
      });

      const { url, error } = await response.json();
      if (error) throw new Error(error);
      
      window.location.href = url;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to access subscription portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  // Show loading state while query is running
  if (!currentPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { systemPlan, paymentPlan, searchCount } = currentPlan;

  // Site Manager view
  if (profile?.userRole === 'site_manager') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Site Manager Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You have full access to all features as a site manager.
          </p>
          <div className="space-y-4">
            <div className="text-sm">
              <p className="font-medium mb-2">Features include:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Unlimited searches</li>
                <li>Access to all premium features</li>
                <li>Site administration tools</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Personal Plan View
  if (systemPlan.name === 'personal') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Personal Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You're on the Personal plan with a limited number of total searches.
          </p>
          <div className="space-y-4">
            {paymentPlan && (
              <div className="text-lg font-semibold">
                {paymentPlan.price} {paymentPlan.currency}
              </div>
            )}

            {paymentPlan?.features && Array.isArray(paymentPlan.features) && (
              <div className="space-y-2">
                <p className="font-medium">Features:</p>
                <ul className="list-disc list-inside space-y-1">
                  {paymentPlan.features.map((feature, index) => (
                    <li key={index} className="text-sm">{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-sm font-medium">
              Searches remaining: {searchCount}
            </p>
            <p className="text-xs text-amber-600">
              Note: This plan has a limited number of total searches that cannot be reset.
            </p>

            <Button 
              onClick={handleManageSubscription} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Manage Subscription'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Free plan view
  if (systemPlan.name === 'free') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Free Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You're currently on the free plan. Upgrade to access premium features!
          </p>
          <p className="text-sm mb-4">
            Searches remaining: {searchCount}
          </p>
          <div className="flex justify-center">
            <Button 
              onClick={handleUpgrade}
              className="w-[68.75%] bg-[#F97316] hover:bg-[#F97316]/90 text-white"
            >
              Upgrade Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Paid plan view (Premium or Teams)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{systemPlan.name.charAt(0).toUpperCase() + systemPlan.name.slice(1)} Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {'description' in systemPlan && systemPlan.description && (
            <p className="text-sm text-muted-foreground">
              {systemPlan.description}
            </p>
          )}
          
          {paymentPlan && (
            <div className="text-lg font-semibold">
              {paymentPlan.price} {paymentPlan.currency}
            </div>
          )}

          {paymentPlan?.features && Array.isArray(paymentPlan.features) && (
            <div className="space-y-2">
              <p className="font-medium">Features:</p>
              <ul className="list-disc list-inside space-y-1">
                {paymentPlan.features.map((feature, index) => (
                  <li key={index} className="text-sm">{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {'is_search_unlimited' in systemPlan && systemPlan.is_search_unlimited ? (
            <p className="text-sm flex items-center">
              <Infinity className="h-4 w-4 mr-1 text-green-500" />
              Unlimited searches
            </p>
          ) : (
            <p className="text-sm">
              Searches remaining: {searchCount}
            </p>
          )}

          <Button 
            onClick={handleManageSubscription} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Manage Subscription'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
