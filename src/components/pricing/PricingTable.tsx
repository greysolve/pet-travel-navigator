
import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2 } from "lucide-react";
import { STRIPE_PUBLISHABLE_KEY, STRIPE_PRICING_TABLE_ID } from "@/config/stripe";
import { stripeApi } from "@/utils/stripeApi";

interface PricingTableProps {
  userId?: string;
}

export const PricingTable = ({ userId }: PricingTableProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

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

  if (error) {
    return (
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Oops!</h1>
        <p className="text-xl text-red-600">{error}</p>
      </div>
    );
  }

  if (isLoading || !isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-lg text-gray-600">Loading pricing plans...</p>
      </div>
    );
  }

  return (
    <stripe-pricing-table
      pricing-table-id={STRIPE_PRICING_TABLE_ID}
      publishable-key={STRIPE_PUBLISHABLE_KEY}
      client-reference-id={userId}
    />
  );
};
