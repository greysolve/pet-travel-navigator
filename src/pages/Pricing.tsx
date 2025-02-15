
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loadStripe } from "@stripe/stripe-js";

const STRIPE_PUBLISHABLE_KEY = "pk_test_51Oq5wVF97qwKzYXUqsxEcBj8QMBXWEQcfKHxbqVEFcLuXFQlqHEMXXdMHIOq4JMJ6C0wFpxHJWwTjLu7DT3BvqP000VCKFAQkr";

const Pricing = () => {
  const { session } = useAuth();

  useEffect(() => {
    // Load and initialize the Stripe Pricing Table
    const initPricingTable = async () => {
      try {
        await loadStripe(STRIPE_PUBLISHABLE_KEY);

        // Remove any existing pricing table script to prevent duplicates
        const existingScript = document.querySelector('script[src*="pricing-table.js"]');
        if (existingScript) {
          existingScript.remove();
        }

        // Load the pricing table script
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/pricing-table.js';
        script.async = true;
        document.body.appendChild(script);

        // Verify the script loads correctly
        script.onerror = () => {
          console.error('Failed to load Stripe Pricing Table script');
        };
      } catch (error) {
        console.error('Error initializing Stripe:', error);
      }
    };

    initPricingTable();

    // Cleanup
    return () => {
      const script = document.querySelector('script[src*="pricing-table.js"]');
      if (script) {
        script.remove();
      }
    };
  }, []);

  return (
    <div className="container mx-auto py-16 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-gray-600">
          Select the perfect plan for your pet travel needs
        </p>
      </div>

      {/* Stripe Pricing Table */}
      <stripe-pricing-table
        pricing-table-id="prctbl_1Oq5wVF97qwKzYXUqsxEcBj8QMBXWEQcfKHxbqVEFcLuXFQlqHEMXXdMHIOq4JMJ6C0wFpxHJWwTjLu7DT3BvqP000VCKFAQkr"
        publishable-key={STRIPE_PUBLISHABLE_KEY}
        client-reference-id={session?.user?.id}
      />
    </div>
  );
};

export default Pricing;
