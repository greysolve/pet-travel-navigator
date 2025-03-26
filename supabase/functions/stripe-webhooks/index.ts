
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import Stripe from 'https://esm.sh/stripe@13.11.0'
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

// Map Stripe price IDs to our subscription plans
async function getPlanFromPriceId(supabaseClient: any, priceId: string, environment: string) {
  const { data: plan } = await supabaseClient
    .from('payment_plans')
    .select('name')
    .eq('stripe_price_id', priceId)
    .eq('environment', environment)
    .single();

  if (!plan) {
    console.error(`No plan found for price ID: ${priceId}`);
    return 'free';
  }

  // Extract the plan type from the name (assuming names are like "Premium Plan ($10 USD)")
  if (plan.name.toLowerCase().includes('premium')) return 'premium';
  if (plan.name.toLowerCase().includes('teams')) return 'teams';
  if (plan.name.toLowerCase().includes('personal')) return 'personal';
  return 'free';
}

Deno.serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('No Stripe signature found');
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    // Get the raw body
    const body = await req.text();
    
    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Processing webhook event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const environment = subscription.livemode ? 'production' : 'test';

        // Get the price ID from the subscription
        const priceId = subscription.items.data[0].price.id;
        
        // Get the user ID from the customer metadata
        const { data: customerData } = await stripe.customers.retrieve(customerId);
        const userId = customerData.metadata?.supabase_user_id;

        if (!userId) {
          throw new Error(`No user ID found for customer: ${customerId}`);
        }

        // Map the Stripe price to our plan type
        const planType = await getPlanFromPriceId(supabaseClient, priceId, environment);

        // Update subscription details
        await supabaseClient
          .from('customer_subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          }, {
            onConflict: 'stripe_subscription_id'
          });

        // Update user's plan in profiles
        await supabaseClient
          .from('profiles')
          .update({ plan: planType })
          .eq('id', userId);

        console.log(`Updated subscription for user ${userId} to plan: ${planType}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find the user by subscription ID
        const { data: subscriptionData } = await supabaseClient
          .from('customer_subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (subscriptionData) {
          // Update subscription status
          await supabaseClient
            .from('customer_subscriptions')
            .update({
              status: 'canceled',
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id);

          // Downgrade user to free plan
          await supabaseClient
            .from('profiles')
            .update({ plan: 'free' })
            .eq('id', subscriptionData.user_id);

          console.log(`Downgraded user ${subscriptionData.user_id} to free plan`);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process webhook' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
