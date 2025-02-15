
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";

interface PlanDetails {
  name: string;
  description: string | null;
  price: number;
  currency: string;
  features: string[];
}

export function SubscriptionManager({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useProfile();

  const { data: currentPlan } = useQuery({
    queryKey: ['profile-plan'],
    queryFn: async () => {
      // First get the user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, search_count')
        .eq('id', userId)
        .maybeSingle();
      
      if (!profile) return null;

      // If user has a plan, find it in payment_plans
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

      // Return basic free plan info if no paid plan found
      return {
        name: "Free Plan",
        description: null,
        price: 0,
        currency: "USD",
        features: [],
        searchCount: profile.search_count ?? 5
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

  // Free plan view
  if (currentPlan.price === 0) {
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
            Searches remaining: {currentPlan.searchCount}
          </p>
          <Button onClick={handleUpgrade}>Upgrade Now</Button>
        </CardContent>
      </Card>
    );
  }

  // Paid plan view
  return (
    <Card>
      <CardHeader>
        <CardTitle>{currentPlan.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {currentPlan.description && (
            <p className="text-sm text-muted-foreground">
              {currentPlan.description}
            </p>
          )}
          
          <div className="text-lg font-semibold">
            {currentPlan.price} {currentPlan.currency}
          </div>

          {currentPlan.features.length > 0 && (
            <div className="space-y-2">
              <p className="font-medium">Features:</p>
              <ul className="list-disc list-inside space-y-1">
                {currentPlan.features.map((feature, index) => (
                  <li key={index} className="text-sm">{feature}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm">
            Searches remaining: {currentPlan.searchCount}
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
