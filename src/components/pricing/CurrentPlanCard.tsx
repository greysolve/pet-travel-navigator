
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PlanDetails } from "@/hooks/use-current-plan";
import { stripeApi } from "@/utils/stripeApi";

interface CurrentPlanCardProps {
  plan: PlanDetails;
  userId: string;
}

export const CurrentPlanCard = ({ plan, userId }: CurrentPlanCardProps) => {
  const { toast } = useToast();
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);

  const handleManageSubscription = async () => {
    try {
      setIsManagingSubscription(true);
      const { url } = await stripeApi.redirectToCustomerPortal(userId);
      window.location.href = url;
    } catch (error) {
      console.error('Error accessing subscription portal:', error);
      toast({
        title: "Error",
        description: "Failed to access subscription portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsManagingSubscription(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Current Plan: {plan.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {plan.description && (
            <p className="text-sm text-muted-foreground">
              {plan.description}
            </p>
          )}
          
          {plan.price > 0 && (
            <div className="text-lg font-semibold">
              {plan.price} {plan.currency}
            </div>
          )}

          {plan.features.length > 0 && (
            <div className="space-y-2">
              <p className="font-medium">Features:</p>
              <ul className="list-disc list-inside space-y-1">
                {plan.features.map((feature, index) => (
                  <li key={index} className="text-sm">{feature}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm">
            Searches remaining: {plan.searchCount}
          </p>

          {plan.price > 0 && (
            <Button 
              onClick={handleManageSubscription} 
              disabled={isManagingSubscription}
              variant="outline"
              className="w-full"
            >
              {isManagingSubscription ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Manage Current Subscription'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
