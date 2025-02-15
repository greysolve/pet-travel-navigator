
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

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

  const { data: currentPlan } = useQuery({
    queryKey: ['profile-plan'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, search_count')
        .eq('id', userId)
        .single();
      
      if (!profile?.plan) return null;

      const { data: planDetails } = await supabase
        .from('payment_plans')
        .select('*')
        .eq('name', profile.plan)
        .single();

      return {
        ...planDetails,
        searchCount: profile.search_count
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

  if (!currentPlan) {
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
            Searches remaining: {currentPlan?.searchCount ?? 5}
          </p>
          <Button onClick={handleUpgrade}>Upgrade Now</Button>
        </CardContent>
      </Card>
    );
  }

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

          {currentPlan.features && currentPlan.features.length > 0 && (
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
