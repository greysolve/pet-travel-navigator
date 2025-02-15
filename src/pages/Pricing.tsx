import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";

const STRIPE_PUBLISHABLE_KEY = "pk_test_51NqfHjElvVFKoCN6Lsnm2iuMMTySB71zpLvlMI6IlqfDG4aMJAFCbEccoGZERXUD5W1BD8YdmNTefLDUcwk869hY00qbXJV9Rl";

interface PlanDetails {
  name: string;
  description: string | null;
  price: number;
  currency: string;
  features: string[];
}

const Pricing = () => {
  const { session } = useAuth();
  const { toast } = useToast();
  const { profile } = useProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);

  const { data: currentPlan } = useQuery({
    queryKey: ['profile-plan'],
    queryFn: async () => {
      if (!session?.user?.id) return null;

      // First get the user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, search_count')
        .eq('id', session.user.id)
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

  useEffect(() => {
    const loadPricingTable = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Remove any existing scripts
        const existingScript = document.querySelector('script[src*="pricing-table.js"]');
        if (existingScript) {
          existingScript.remove();
        }

        // Create and load new script
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/pricing-table.js';
        script.async = true;

        // Wait for script to load
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load Stripe Pricing Table script'));
          document.body.appendChild(script);
        });

        // Initialize Stripe only after script is loaded
        await loadStripe(STRIPE_PUBLISHABLE_KEY);
        setIsReady(true);
      } catch (err) {
        console.error('Pricing table error:', err);
        setError('Failed to load pricing table. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPricingTable();

    // Cleanup
    return () => {
      const script = document.querySelector('script[src*="pricing-table.js"]');
      if (script) {
        script.remove();
      }
    };
  }, []);

  const handleManageSubscription = async () => {
    try {
      setIsManagingSubscription(true);
      const response = await fetch('/api/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'portal',
          userId: session?.user?.id
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
      setIsManagingSubscription(false);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Oops!</h1>
          <p className="text-xl text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading || !isReady) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="text-lg text-gray-600">Loading pricing plans...</p>
        </div>
      </div>
    );
  }

  // Site Manager view
  if (profile?.userRole === 'site_manager') {
    return (
      <div className="container mx-auto py-16 px-4">
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
      </div>
    );
  }

  return (
    <div className="container mx-auto py-16 px-4">
      {/* Current Plan Section */}
      {currentPlan && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Current Plan: {currentPlan.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentPlan.description && (
                <p className="text-sm text-muted-foreground">
                  {currentPlan.description}
                </p>
              )}
              
              {currentPlan.price > 0 && (
                <div className="text-lg font-semibold">
                  {currentPlan.price} {currentPlan.currency}
                </div>
              )}

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

              {currentPlan.price > 0 && (
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
      )}

      {/* Available Plans Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-gray-600">
          Select the perfect plan for your pet travel needs
        </p>
      </div>

      {/* Stripe Pricing Table */}
      <stripe-pricing-table
        pricing-table-id="prctbl_1QsXnwElvVFKoCN6vbUHDEL5"
        publishable-key={STRIPE_PUBLISHABLE_KEY}
        client-reference-id={session?.user?.id}
      />
    </div>
  );
};

export default Pricing;
