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

// Function to create a new user in Supabase Auth with password reset
async function createUserInSupabase(supabaseClient: any, email: string, fullName: string, customerId: string, plan: string = 'free') {
  try {
    console.log(`Creating new user for email: ${email} with plan: ${plan} and name: ${fullName}`);
    
    // Generate a secure random password (the user will reset it later)
    const password = crypto.randomUUID();
    
    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        stripe_customer_id: customerId,
        full_name: fullName,
      }
    });
    
    if (authError) {
      console.error('Error creating auth user:', authError);
      throw authError;
    }
    
    const userId = authData.user.id;
    console.log(`Created auth user with ID: ${userId}`);

    // Send password reset email with redirect to application
    const { error: resetError } = await supabaseClient.auth.admin.sendPasswordResetEmail(email, {
      redirectTo: 'https://www.petjumper.com/auth/callback?reset_password=true'
    });
    
    if (resetError) {
      console.error('Error sending password reset email:', resetError);
      // Continue even if reset email fails - we can manually reset later
    } else {
      console.log('Password reset email sent successfully');
    }
    
    // Update the profile with the plan and formatted name
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ 
        plan,
        full_name: fullName
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
    
    // Update user role to pet_lover for paid plans
    // Note: The trigger will have already created a pet_caddie role
    // so we use upsert with onConflict to update it for paid plans
    if (plan !== 'free') {
      const { error: roleError } = await supabaseClient
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: 'pet_lover' // Paid users get pet_lover role
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });
        
      if (roleError) {
        console.error('Error updating user role:', roleError);
        throw roleError;
      }
    }
    
    return userId;
  } catch (error) {
    console.error('Error in createUserInSupabase:', error);
    throw error;
  }
}

// Find user by exact email using auth admin API
async function findUserByEmail(supabaseClient: any, email: string) {
  console.log(`Finding user by email: ${email}`);
  
  try {
    // Use auth admin API to find the user
    const { data, error } = await supabaseClient.auth.admin.listUsers({
      filter: {
        email: email
      }
    });
    
    if (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
    
    // Check if we found exact match for the email
    const users = data?.users || [];
    console.log(`Found ${users.length} users with email filter`);
    
    if (users.length === 0) {
      return null;
    }
    
    // Log all users found for debugging
    users.forEach((user: any, index: number) => {
      console.log(`User ${index + 1} - ID: ${user.id}, Email: ${user.email}`);
    });
    
    // Find exact match
    const exactMatch = users.find(user => user.email.toLowerCase() === email.toLowerCase());
    
    if (!exactMatch) {
      console.warn('WARNING: Found users but none with exact email match!');
      return null;
    }
    
    return exactMatch;
  } catch (error) {
    console.error('Error in findUserByEmail:', error);
    return null;
  }
}

// Ensure user exists and is properly linked to Stripe customer
async function ensureUserExists(supabaseClient: any, email: string, fullName: string, customerId: string, plan: string = 'free') {
  console.log(`Ensuring user exists for email: ${email}`);
  
  try {
    // First try to find user by exact email match
    const user = await findUserByEmail(supabaseClient, email);
    
    // If user doesn't exist, create one
    if (!user) {
      console.log(`No user found with email ${email}, creating new user`);
      return await createUserInSupabase(supabaseClient, email, fullName, customerId, plan);
    } else {
      const userId = user.id;
      console.log(`Found existing user with ID: ${userId} for email: ${email}`);
      
      // Make sure customer subscription record exists and is linked
      await supabaseClient
        .from('customer_subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          status: 'active'
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });
        
      // Update user metadata with Stripe customer ID if needed
      if (!user.user_metadata?.stripe_customer_id) {
        await supabaseClient.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...user.user_metadata,
            stripe_customer_id: customerId,
            full_name: fullName
          }
        });
      }
      
      // Update profile with fullName and plan
      await supabaseClient
        .from('profiles')
        .update({ 
          full_name: fullName,
          plan: plan
        })
        .eq('id', userId);
      
      // Update user role to pet_lover for paid plans
      if (plan !== 'free') {
        const { error: roleError } = await supabaseClient
          .from('user_roles')
          .upsert({
            user_id: userId,
            role: 'pet_lover' // Paid users get pet_lover role
          }, {
            onConflict: 'user_id',
            ignoreDuplicates: false
          });
          
        if (roleError) {
          console.error('Error updating user role:', roleError);
          // Continue despite error - not critical
        } else {
          console.log(`Updated user ${userId} role to pet_lover for paid plan`);
        }
      }
      
      return userId;
    }
  } catch (error) {
    console.error(`Error in ensureUserExists for email ${email}:`, error);
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
          console.error('Customer email not found in webhook event');
          throw new Error('Customer email not found');
        }
        
        console.log(`Processing customer.created for email: ${email}, customer ID: ${customerId}`);
        
        // Get customer name from Stripe
        let fullName = customer.name || '';
        
        // If no name, extract from email
        if (!fullName) {
          const emailName = email.split('@')[0];
          fullName = emailName
            .replace(/[._]/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
        }
        
        // Get stripe instance
        const stripe = getStripeInstance(event.livemode);
        
        // Check if the customer has a completed payment intent (for one-time payments)
        const paymentIntents = await stripe.paymentIntents.list({
          customer: customerId,
          limit: 1
        });
        
        let planType = 'free';
        
        if (paymentIntents.data.length > 0 && paymentIntents.data[0].status === 'succeeded') {
          // This is a one-time payment, get the plan from the payment intent metadata
          const paymentIntent = paymentIntents.data[0];
          if (paymentIntent.metadata.price_id) {
            planType = await getPlanFromPriceId(supabaseClient, paymentIntent.metadata.price_id, environment);
            console.log(`Customer has a successful payment with plan: ${planType}`);
          }
        } else {
          // Check for subscriptions
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1
          });
          
          if (subscriptions.data.length > 0) {
            // Get the subscription and price info
            const subscription = subscriptions.data[0];
            const priceId = subscription.items.data[0].price.id;
            planType = await getPlanFromPriceId(supabaseClient, priceId, environment);
            console.log(`Customer has active subscription with plan: ${planType}`);
          } else {
            console.log('Customer has no active subscriptions or payments, using free plan');
          }
        }
        
        // Create or link the user and set their plan
        const userId = await ensureUserExists(supabaseClient, email, fullName, customerId, planType);
        
        break;
      }
      
      case 'checkout.session.completed': {
        // Handle checkout session completion - this is critical for one-time payments
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        
        if (!customerId) {
          console.error('No customer ID found in checkout session');
          throw new Error('No customer ID found in checkout session');
        }
        
        // Get stripe instance for this environment
        const stripe = getStripeInstance(event.livemode);
        
        // Get the customer details
        const customer = await stripe.customers.retrieve(customerId);
        
        if (!customer || ('deleted' in customer) || !customer.email) {
          throw new Error(`No valid customer data or email found for customer: ${customerId}`);
        }
        
        const customerEmail = customer.email;
        const customerName = customer.name || customerEmail.split('@')[0].replace(/[._]/g, ' ');
        
        console.log(`Processing checkout session for email: ${customerEmail}, customer ID: ${customerId}`);
        
        // Get the price ID - for one-time payments we need to get the price from payment_link
        let planType = 'free';
        let priceId = null;
        
        // Get payment intent for one-time payments
        if (session.payment_intent) {
          const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
          console.log('Retrieved payment intent:', paymentIntent.id);
          
          // For payment links, get the price ID from the payment link configuration
          if (session.payment_link) {
            try {
              // Make sure to expand line_items to get the price information
              const paymentLink = await stripe.paymentLinks.retrieve(session.payment_link, {
                expand: ['line_items', 'line_items.data.price']
              });
              console.log('Retrieved payment link:', paymentLink.id);
              
              if (paymentLink.line_items?.data && paymentLink.line_items.data.length > 0) {
                const price = paymentLink.line_items.data[0].price;
                if (price) {
                  priceId = price.id;
                  console.log(`Found price ID ${priceId} from payment link`);
                  planType = await getPlanFromPriceId(supabaseClient, priceId, environment);
                  console.log(`Mapped price from payment link to plan: ${planType}`);
                }
              }
            } catch (e) {
              console.error('Error retrieving payment link:', e);
            }
          }
        }
        
        // If we still don't have a plan, check if there's a subscription
        if (planType === 'free') {
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1
          });
          
          if (subscriptions.data.length > 0) {
            const subscription = subscriptions.data[0];
            priceId = subscription.items.data[0].price.id;
            planType = await getPlanFromPriceId(supabaseClient, priceId, environment);
            console.log(`Found active subscription with plan: ${planType}`);
          }
        }
        
        // Ensure user exists (or create them)
        const userId = await ensureUserExists(supabaseClient, customerEmail, customerName, customerId, planType);
        
        console.log(`Updated user ${userId} to plan: ${planType} after checkout`);
        
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
        
        try {
          // Retrieve the customer to get their email and name
          const customer = await stripe.customers.retrieve(customerId);
          
          if (!customer || ('deleted' in customer) || !customer.email) {
            throw new Error(`No valid customer data or email found for customer: ${customerId}`);
          }
          
          const customerEmail = customer.email;
          const customerName = customer.name || customerEmail.split('@')[0].replace(/[._]/g, ' ');
          
          console.log(`Processing subscription for email: ${customerEmail}, customer ID: ${customerId}`);
          
          // Map the Stripe price to our plan type
          const planType = await getPlanFromPriceId(supabaseClient, priceId, environment);
          console.log(`Mapped price ${priceId} to plan: ${planType}`);
          
          // Make sure the user exists in our system
          const userId = await ensureUserExists(supabaseClient, customerEmail, customerName, customerId, planType);
          
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
              onConflict: 'user_id',
              ignoreDuplicates: false
            });

          console.log(`Updated subscription for user ${userId} to plan: ${planType}`);
        } catch (error) {
          console.error('Error processing subscription:', error);
          throw error;
        }
        
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
            
          // Update role back to pet_caddie
          await supabaseClient
            .from('user_roles')
            .upsert({
              user_id: subscriptionData.user_id,
              role: 'pet_caddie'
            }, {
              onConflict: 'user_id',
              ignoreDuplicates: false
            });

          console.log(`Downgraded user ${subscriptionData.user_id} to free plan and pet_caddie role`);
        }
        break;
      }
      
      case 'customer.deleted': {
        // If a customer is deleted in Stripe, we might want to update our database
        // This is optional and depends on your business logic
        const customer = event.data.object as Stripe.Customer;
        console.log(`Customer deleted: ${customer.id}`);
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
