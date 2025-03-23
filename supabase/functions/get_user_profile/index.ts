
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ProfileError = {
  message: string;
  type: 'not_found' | 'network' | 'unknown';
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get user ID from request
    const { userId } = await req.json();
    console.log('Fetching profile for user:', userId);

    if (!userId) {
      throw { message: 'User ID is required', type: 'unknown' } as ProfileError;
    }

    // Get profile and role data in a transaction
    const { data, error } = await supabaseAdmin.rpc('get_profile_with_role', {
      user_id: userId
    });

    if (error) {
      console.error('Error fetching profile:', error);
      throw { message: 'Failed to fetch user profile', type: 'network' } as ProfileError;
    }

    if (!data || !data.profile) {
      console.error('No profile found for user');
      throw { message: 'User profile not found', type: 'not_found' } as ProfileError;
    }

    // Validate and transform the data
    const userProfile = {
      id: userId,
      userRole: data.role || 'pet_caddie',
      created_at: data.profile.created_at,
      updated_at: data.profile.updated_at,
      full_name: data.profile.full_name ?? undefined,
      avatar_url: data.profile.avatar_url ?? undefined,
      address_line1: data.profile.address_line1 ?? undefined,
      address_line2: data.profile.address_line2 ?? undefined,
      address_line3: data.profile.address_line3 ?? undefined,
      locality: data.profile.locality ?? undefined,
      administrative_area: data.profile.administrative_area ?? undefined,
      postal_code: data.profile.postal_code ?? undefined,
      country_id: data.profile.country_id ?? undefined,
      address_format: data.profile.address_format ?? undefined,
      plan: data.profile.plan,
      search_count: data.profile.search_count ?? undefined,
      notification_preferences: data.profile.notification_preferences
    };

    console.log('Successfully mapped profile:', userProfile);

    return new Response(
      JSON.stringify(userProfile),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in get_user_profile:', error);
    const profileError = error as ProfileError;
    return new Response(
      JSON.stringify({
        error: profileError.message || 'An unexpected error occurred',
        type: profileError.type || 'unknown'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});

