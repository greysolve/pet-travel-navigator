
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import Stripe from 'https://esm.sh/stripe@13.11.0'
import { corsHeaders } from '../_shared/cors.ts';

// Function to get the appropriate Stripe instance based on environment
const getStripeInstance = (environment: 'test' | 'production') => {
  const secretKey = environment === 'test' 
    ? Deno.env.get('STRIPE_TEST_SECRET_KEY')
    : Deno.env.get('STRIPE_PROD_SECRET_KEY');
    
  if (!secretKey) {
    throw new Error(`Stripe secret key not found for ${environment} environment`);
  }

  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, priceId, userId, environment = 'test' } = await req.json();
    console.log('Processing action:', action, 'in environment:', environment);

    // Get the appropriate Stripe instance
    const stripe = getStripeInstance(environment);

    if (action === 'import-plans') {
      console.log(`Starting plan import process for ${environment} environment`);
      const products = await stripe.products.list({ active: true });
      console.log(`Found ${products.data.length} active products`);
      
      const prices = await stripe.prices.list({ active: true });
      console.log(`Found ${prices.data.length} active prices`);

      const productPrices = new Map();
      prices.data.forEach(price => {
        if (!productPrices.has(price.product)) {
          productPrices.set(price.product, []);
        }
        productPrices.get(price.product).push(price);
      });

      let importedCount = 0;
      for (const product of products.data) {
        const prices = productPrices.get(product.id) || [];
        console.log(`Processing product "${product.name}" with ${prices.length} prices`);
        
        for (const price of prices) {
          try {
            const priceAmount = price.unit_amount ? price.unit_amount / 100 : 0;
            console.log(`Processing price ${price.id} (${priceAmount} ${price.currency.toUpperCase()})`);
            
            const planData = {
              name: `${product.name} (${priceAmount} ${price.currency.toUpperCase()})`,
              description: product.description,
              price: priceAmount,
              currency: price.currency.toUpperCase(),
              stripe_price_id: price.id,
              features: product.metadata.features ? 
                JSON.parse(product.metadata.features) : 
                [],
              environment: environment
            };

            const { error } = await supabaseClient
              .from('payment_plans')
              .upsert(
                planData,
                { 
                  onConflict: 'stripe_price_id',
                  ignoreDuplicates: false
                }
              );

            if (error) {
              console.error(`Error upserting plan for price ${price.id}:`, error);
              continue;
            }

            importedCount++;
          } catch (error) {
            console.error(`Error processing price ${price.id}:`, error);
            continue;
          }
        }
      }

      console.log(`Plan import completed. Successfully imported ${importedCount} plans`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Successfully imported ${importedCount} plans` 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (action === 'create-subscription') {
      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      let customerId: string;
      const { data: existingSubscription } = await supabaseClient
        .from('customer_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

      if (existingSubscription?.stripe_customer_id) {
        customerId = existingSubscription.stripe_customer_id;
      } else {
        const customer = await stripe.customers.create({
          email: profiles?.email,
          metadata: {
            supabase_user_id: userId,
          },
        });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.headers.get('origin')}/profile?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get('origin')}/pricing`,
        metadata: {
          user_id: userId,
        },
      });

      return new Response(
        JSON.stringify({ sessionId: session.id, url: session.url }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (action === 'portal') {
      const { data: subscription } = await supabaseClient
        .from('customer_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

      if (!subscription?.stripe_customer_id) {
        throw new Error('No customer found');
      }

      const { url } = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: `${req.headers.get('origin')}/profile`,
      });

      return new Response(
        JSON.stringify({ url }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error in Stripe function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
