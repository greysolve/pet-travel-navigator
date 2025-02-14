
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import Stripe from 'https://esm.sh/stripe@13.11.0'
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, priceId, userId } = await req.json();

    if (action === 'create-subscription') {
      // Get or create customer
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

      // Create a checkout session
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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
