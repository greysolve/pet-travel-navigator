import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      }
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Handle DELETE request for user deletion
    if (req.method === 'DELETE') {
      const { userId } = await req.json();
      console.log('Deleting user:', userId);

      try {
        // Delete the auth user (this will trigger the handle_deleted_user function)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
        
        if (deleteError) {
          console.error('Error deleting auth user:', deleteError);
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            },
          );
        }

        return new Response(
          JSON.stringify({ message: 'User deleted successfully' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        );
      } catch (error) {
        console.error('Error in delete operation:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          },
        );
      }
    }

    // Handle GET request for fetching users
    console.log('Fetching auth users...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('Error fetching auth users:', authError);
      throw authError;
    }
    console.log('Auth users fetched:', users.length);

    // Get all profiles
    console.log('Fetching profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }
    console.log('Profiles fetched:', profiles?.length);

    // Get all roles
    console.log('Fetching user roles...');
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');
    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      throw rolesError;
    }
    console.log('Roles fetched:', roles?.length);

    // Start with auth users and enrich with profile and role data
    const userProfiles: UserProfile[] = users.map((user) => {
      const profile = profiles.find((p) => p.id === user.id);
      const userRole = roles.find((r) => r.user_id === user.id);
      const userProfile = {
        id: user.id,
        full_name: profile?.full_name || null,
        email: user.email || '',
        role: userRole?.role || 'pet_lover',
      };
      console.log('Mapped user profile:', userProfile);
      return userProfile;
    });

    console.log('Total user profiles mapped:', userProfiles.length);

    return new Response(
      JSON.stringify(userProfiles),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in manage_users function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});