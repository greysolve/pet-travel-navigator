
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

// Fix subscription issues for a user
async function fixUserSubscription(supabaseClient: any, userId: string, environment: 'test' | 'production') {
  console.log(`Attempting to fix subscription for user ${userId} in ${environment} environment`);
  
  try {
    const stripe = getStripeInstance(environment);
    
    // Step 1: Check if the user has a subscription in Stripe
    const { data: customerSubscription } = await supabaseClient
      .from('customer_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (!customerSubscription || !customerSubscription.stripe_customer_id) {
      console.log(`No Stripe customer found for user ${userId}`);
      return { success: false, message: 'No Stripe customer found' };
    }
    
    // Step 2: Get the customer from Stripe
    try {
      const customer = await stripe.customers.retrieve(customerSubscription.stripe_customer_id);
      
      if ('deleted' in customer) {
        console.log(`Customer ${customerSubscription.stripe_customer_id} has been deleted in Stripe`);
        return { success: false, message: 'Customer has been deleted in Stripe' };
      }
      
      // Check if customer metadata has user ID
      if (!customer.metadata.supabase_user_id) {
        // Update customer with user ID
        await stripe.customers.update(customer.id, {
          metadata: { supabase_user_id: userId }
        });
        console.log(`Updated customer ${customer.id} with user ID ${userId}`);
      }
      
      // Step 3: Check for active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active'
      });
      
      if (subscriptions.data.length === 0) {
        console.log(`No active subscriptions found for customer ${customer.id}`);
        
        // Check if there's a subscription in 'customer_subscriptions' that we need to update
        if (customerSubscription.status === 'active') {
          await supabaseClient
            .from('customer_subscriptions')
            .update({ status: 'canceled' })
            .eq('id', customerSubscription.id);
            
          await supabaseClient
            .from('profiles')
            .update({ plan: 'free' })
            .eq('id', userId);
            
          console.log(`Updated user ${userId} subscription status to canceled and plan to free`);
          return { success: true, message: 'User subscription status corrected to canceled and plan set to free' };
        }
        
        return { success: false, message: 'No active subscriptions found' };
      }
      
      // Use the most recent active subscription
      const subscription = subscriptions.data[0];
      
      // Step 4: Get the price ID and map to a plan
      const priceId = subscription.items.data[0].price.id;
      
      // Look up the payment plan with this price ID
      const { data: paymentPlan } = await supabaseClient
        .from('payment_plans')
        .select('system_plan_id, name')
        .eq('stripe_price_id', priceId)
        .eq('environment', environment)
        .maybeSingle();
        
      let planType = 'free';
      
      if (paymentPlan?.system_plan_id) {
        const { data: systemPlan } = await supabaseClient
          .from('system_plans')
          .select('name')
          .eq('id', paymentPlan.system_plan_id)
          .maybeSingle();
          
        if (systemPlan) {
          planType = systemPlan.name;
        }
      } else if (paymentPlan) {
        // Try to determine from name
        if (paymentPlan.name.toLowerCase().includes('premium')) planType = 'premium';
        else if (paymentPlan.name.toLowerCase().includes('teams')) planType = 'teams';
        else if (paymentPlan.name.toLowerCase().includes('personal')) planType = 'personal';
      }
      
      // Step 5: Update the subscription in our database
      await supabaseClient
        .from('customer_subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        }, {
          onConflict: 'stripe_subscription_id'
        });
        
      // Step 6: Update the user's plan
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ plan: planType })
        .eq('id', userId);
        
      if (updateError) {
        console.error(`Error updating user plan: ${updateError.message}`);
        return { success: false, message: `Failed to update user plan: ${updateError.message}` };
      }
      
      console.log(`Successfully updated user ${userId} to plan ${planType}`);
      return { success: true, message: `Successfully updated user to plan: ${planType}` };
      
    } catch (error) {
      console.error(`Error with Stripe customer: ${error.message}`);
      return { success: false, message: `Stripe error: ${error.message}` };
    }
    
  } catch (error) {
    console.error(`Error fixing subscription: ${error.message}`);
    return { success: false, message: `Error: ${error.message}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, userId, environment = 'test' } = await req.json();
    console.log(`Processing action: ${action} for user: ${userId} in environment: ${environment}`);

    if (action === 'fix-user-subscription') {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const result = await fixUserSubscription(
        supabaseClient, 
        userId, 
        environment as 'test' | 'production'
      );
      
      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (action === 'list-payment-plans') {
      // List all payment plans to help debugging
      const { data: paymentPlans, error } = await supabaseClient
        .from('payment_plans')
        .select('*')
        .eq('environment', environment);
        
      if (error) {
        throw new Error(`Failed to list payment plans: ${error.message}`);
      }
      
      return new Response(
        JSON.stringify({ plans: paymentPlans }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error in fix-subscriptions function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
