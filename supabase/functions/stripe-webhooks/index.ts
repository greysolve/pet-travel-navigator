
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import Stripe from 'https://esm.sh/stripe@13.11.0'
import { corsHeaders } from '../_shared/cors.ts';

// Function to get the appropriate Stripe instance based on event livemode
const getStripeInstance = (livemode: boolean) => {
  const secretKey = livemode 
    ? Deno.env.get('STRIPE_PROD_SECRET_KEY')
    : Deno.env.get('STRIPE_TEST_SECRET_KEY');
    
  if (!secretKey) {
    throw new Error(`Stripe secret key not found for ${livemode ? 'production' : 'test'} environment`);
  }

  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
};

// Get plan from Stripe price ID by looking up the payment_plans table
// and then finding the associated system_plan
async function getPlanFromPriceId(supabaseClient: any, priceId: string, environment: string) {
  try {
    // First, look up the payment plan with this price ID
    const { data: paymentPlan, error: paymentPlanError } = await supabaseClient
      .from('payment_plans')
      .select('system_plan_id, name')
      .eq('stripe_price_id', priceId)
      .eq('environment', environment)
      .single();

    if (paymentPlanError || !paymentPlan) {
      console.error(`No payment plan found for price ID: ${priceId}`, paymentPlanError);
      return 'free';
    }

    // If we have a system_plan_id, use that to get the plan name
    if (paymentPlan.system_plan_id) {
      const { data: systemPlan, error: systemPlanError } = await supabaseClient
        .from('system_plans')
        .select('name')
        .eq('id', paymentPlan.system_plan_id)
        .single();

      if (systemPlanError || !systemPlan) {
        console.error(`No system plan found for ID: ${paymentPlan.system_plan_id}`, systemPlanError);
        return 'free';
      }

      return systemPlan.name;
    }
    
    // If no system_plan_id yet (during transition period), extract from name
    if (paymentPlan.name.toLowerCase().includes('premium')) return 'premium';
    if (paymentPlan.name.toLowerCase().includes('teams')) return 'teams';
    if (paymentPlan.name.toLowerCase().includes('personal')) return 'personal';
    return 'free';
  } catch (error) {
    console.error('Error in getPlanFromPriceId:', error);
    return 'free';
  }
}

// Function to create a new user in Supabase Auth
async function createUserInSupabase(supabaseClient: any, email: string, customerId: string, plan: string = 'free') {
  try {
    console.log(`Creating new user for email: ${email} with plan: ${plan}`);
    
    // Generate a secure random password (the user will reset it later)
    const password = crypto.randomUUID();
    
    // Extract a name from the email for temporary user details
    const tempName = email.split('@')[0];
    // Convert to Title Case and replace dots/underscores with spaces
    const formattedName = tempName
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
    
    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        stripe_customer_id: customerId,
        full_name: formattedName, // Use formatted name for better display
      }
    });
    
    if (authError) {
      console.error('Error creating auth user:', authError);
      throw authError;
    }
    
    const userId = authData.user.id;
    console.log(`Created auth user with ID: ${userId}`);
    
    // Update the profile with the plan and formatted name
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ 
        plan,
        full_name: formattedName
      })
      .eq('id', userId);
      
    if (profileError) {
      console.error('Error updating profile:', profileError);
      throw profileError;
    }
    
    // Create subscription record
    const { error: subscriptionError } = await supabaseClient
      .from('customer_subscriptions')
      .insert({
        user_id: userId,
        stripe_customer_id: customerId,
        status: 'active'
      });
      
    if (subscriptionError) {
      console.error('Error creating customer subscription:', subscriptionError);
      throw subscriptionError;
    }
    
    // Create default user role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'pet_lover' // Default role
      });
      
    if (roleError) {
      console.error('Error creating user role:', roleError);
      throw roleError;
    }
    
    return userId;
  } catch (error) {
    console.error('Error in createUserInSupabase:', error);
    throw error;
  }
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
      // Parse the event without verification first to get livemode
      const unverifiedEvent = JSON.parse(body);
      const livemode = unverifiedEvent.livemode === true;
      const stripe = getStripeInstance(livemode);
      
      event = await stripe.webhooks.constructEventAsync(
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
    
    // Define the environment based on event livemode
    const environment = event.livemode ? 'production' : 'test';

    // Handle different event types
    switch (event.type) {
      case 'customer.created': {
        const customer = event.data.object as Stripe.Customer;
        const email = customer.email;
        const customerId = customer.id;
        
        if (!email) {
          throw new Error('Customer email not found');
        }
        
        console.log(`Processing customer.created for email: ${email}`);
        
        // Check if the user already exists in Supabase by email
        const { data: existingUsers, error: userError } = await supabaseClient.auth.admin.listUsers({
          email: email,
        });
        
        if (userError) {
          console.error('Error checking existing user:', userError);
          throw userError;
        }
        
        // If user doesn't exist, create one
        if (!existingUsers.users || existingUsers.users.length === 0) {
          // Check if the customer has an active subscription to determine plan
          const stripe = getStripeInstance(event.livemode);
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1
          });
          
          let planType = 'free';
          if (subscriptions.data.length > 0) {
            // Get the price ID from the subscription
            const priceId = subscriptions.data[0].items.data[0].price.id;
            planType = await getPlanFromPriceId(supabaseClient, priceId, environment);
          }
          
          const userId = await createUserInSupabase(supabaseClient, email, customerId, planType);
          console.log(`Created new user with ID: ${userId} for customer: ${customerId} with plan: ${planType}`);
        } else {
          console.log(`User with email ${email} already exists, linking customer ID`);
          const userId = existingUsers.users[0].id;
          
          // Link this customer ID to the existing user
          const { error: updateError } = await supabaseClient
            .from('customer_subscriptions')
            .upsert({
              user_id: userId,
              stripe_customer_id: customerId,
              status: 'active'
            });
            
          if (updateError) {
            console.error('Error linking customer to existing user:', updateError);
            throw updateError;
          }
          
          // Update user metadata with Stripe customer ID
          await supabaseClient.auth.admin.updateUserById(userId, {
            user_metadata: {
              ...existingUsers.users[0].user_metadata,
              stripe_customer_id: customerId
            }
          });
        }
        
        break;
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Get stripe instance matching the event environment
        const stripe = getStripeInstance(subscription.livemode);

        // Get the price ID from the subscription
        const priceId = subscription.items.data[0].price.id;
        
        // Get the user ID from various sources
        let userId = null;
        
        // Try from subscription metadata first
        if (subscription.metadata?.user_id) {
          userId = subscription.metadata.user_id;
          console.log('Found user ID in subscription metadata:', userId);
        }
        
        // If not found, try from customer metadata
        if (!userId) {
          try {
            const { data: customerData } = await stripe.customers.retrieve(customerId);
            if (customerData && !('deleted' in customerData)) {
              userId = customerData.metadata?.supabase_user_id;
              console.log('Found user ID in customer metadata:', userId);
            }
          } catch (error) {
            console.error('Error retrieving customer:', error);
          }
        }
        
        // If still not found, try from customer_subscriptions table
        if (!userId) {
          const { data: subData } = await supabaseClient
            .from('customer_subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();
            
          if (subData?.user_id) {
            userId = subData.user_id;
            console.log('Found user ID in customer_subscriptions table:', userId);
          }
        }

        // If still not found, see if there's a user with this customer ID in profile metadata
        if (!userId) {
          const { data: users, error: usersError } = await supabaseClient.auth.admin.listUsers({});
          if (!usersError && users.users) {
            const userWithCustomerId = users.users.find(user => 
              user.user_metadata?.stripe_customer_id === customerId
            );
            if (userWithCustomerId) {
              userId = userWithCustomerId.id;
              console.log('Found user by customer ID in user metadata:', userId);
            }
          }
        }

        // If still not found, check if we can find a user by customer email
        if (!userId) {
          try {
            const { data: customerData } = await stripe.customers.retrieve(customerId);
            if (customerData && !('deleted' in customerData) && customerData.email) {
              const { data: emailUsers } = await supabaseClient.auth.admin.listUsers({
                email: customerData.email
              });
              
              if (emailUsers.users && emailUsers.users.length > 0) {
                userId = emailUsers.users[0].id;
                console.log('Found user by email address:', userId);
                
                // Link this customer ID to the found user
                await supabaseClient
                  .from('customer_subscriptions')
                  .upsert({
                    user_id: userId,
                    stripe_customer_id: customerId,
                    status: 'active'
                  });
              } else {
                // Create a new user if no matching email found
                console.log('No user found by email, creating new user');
                userId = await createUserInSupabase(
                  supabaseClient, 
                  customerData.email, 
                  customerId
                );
              }
            }
          } catch (error) {
            console.error('Error looking up customer or creating user:', error);
          }
        }

        if (!userId) {
          throw new Error(`No user ID found for customer: ${customerId}`);
        }

        // Map the Stripe price to our plan type
        const planType = await getPlanFromPriceId(supabaseClient, priceId, environment);
        console.log(`Mapped price ${priceId} to plan: ${planType}`);

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
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({ plan: planType })
          .eq('id', userId);
          
        if (updateError) {
          console.error(`Error updating user plan: ${updateError.message}`);
          throw new Error(`Failed to update user plan: ${updateError.message}`);
        }

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
      JSON.stringify({ error: 'Failed to process webhook', details: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
