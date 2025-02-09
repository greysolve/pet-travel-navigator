
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

interface UpdateUserData {
  id: string;
  full_name?: string;
  role?: 'pet_lover' | 'pet_caddie';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'GET, DELETE, PATCH, OPTIONS',
      }
    });
  }

  try {
    // Initialize Supabase client with service role key for admin operations
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

    // Handle PATCH request for user updates
    if (req.method === 'PATCH') {
      const updateData: UpdateUserData = await req.json();
      console.log('Updating user:', updateData);

      try {
        // Update profile if full_name is provided
        if (updateData.full_name !== undefined) {
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ full_name: updateData.full_name })
            .eq('id', updateData.id);

          if (profileError) {
            console.error('Error updating profile:', profileError);
            throw profileError;
          }
        }

        // Update role if provided
        if (updateData.role) {
          // First, update or insert the role
          const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .upsert({
              user_id: updateData.id,
              role: updateData.role
            }, {
              onConflict: 'user_id'
            });

          if (roleError) {
            console.error('Error updating role:', roleError);
            throw roleError;
          }
        }

        return new Response(
          JSON.stringify({ message: 'User updated successfully' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        );
      } catch (error) {
        console.error('Error in update operation:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Error updating user', 
            details: error.message 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          },
        );
      }
    }

    // Handle DELETE request for user deletion
    if (req.method === 'DELETE') {
      const { userId } = await req.json();
      console.log('Starting hard deletion process for user:', userId);

      try {
        // Delete the auth user using admin client with hard delete (soft_delete = false)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
          userId,
          false // Set soft delete to false to ensure hard deletion
        );
        
        if (deleteError) {
          console.error('Error deleting auth user:', deleteError);
          throw deleteError;
        }

        console.log('User hard deleted successfully:', userId);
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
          JSON.stringify({ 
            error: 'Error deleting user', 
            details: error.message,
            status: error.status || 500
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: error.status || 500,
          },
        );
      }
    }

    // Handle GET request for fetching users
    console.log('Fetching auth users...');
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error('Error fetching auth users:', authError);
      throw authError;
    }
    console.log('Auth users fetched:', users.length);

    // Get all profiles
    console.log('Fetching profiles...');
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*');
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }
    console.log('Profiles fetched:', profiles?.length);

    // Get all roles
    console.log('Fetching user roles...');
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('*');
    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      throw rolesError;
    }
    console.log('Roles fetched:', roles?.length);

    // Map users with their profile and role data
    const userProfiles: UserProfile[] = users.map((user) => {
      const profile = profiles?.find((p) => p.id === user.id);
      const userRole = roles?.find((r) => r.user_id === user.id);
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
      JSON.stringify({ 
        error: error.message,
        status: error.status || 500
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.status || 500,
      },
    );
  }
});
