
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  plan: string;
}

interface UpdateUserData {
  id: string;
  first_name?: string;
  last_name?: string;
  role?: 'pet_lover' | 'pet_caddie' | 'site_manager';
  plan?: 'free' | 'premium' | 'teams' | 'personal';
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
        // Update profile if first_name or last_name or plan is provided
        if (updateData.first_name !== undefined || updateData.last_name !== undefined || updateData.plan !== undefined) {
          const updateObject: { full_name?: string; plan?: string } = {};
          
          // Concatenate first and last name if either is provided
          if (updateData.first_name !== undefined || updateData.last_name !== undefined) {
            // Get current profile to preserve existing name parts
            const { data: currentProfile } = await supabaseAdmin
              .from('profiles')
              .select('full_name')
              .eq('id', updateData.id)
              .single();

            let currentNames = currentProfile?.full_name ? currentProfile.full_name.split(' ') : ['', ''];
            let firstName = updateData.first_name ?? currentNames[0];
            let lastName = updateData.last_name ?? (currentNames.length > 1 ? currentNames.slice(1).join(' ') : '');
            
            updateObject.full_name = `${firstName} ${lastName}`.trim();
          }

          if (updateData.plan !== undefined) {
            // Validate plan against system_plans
            const { data: planData, error: planError } = await supabaseAdmin
              .from('system_plans')
              .select('name')
              .eq('name', updateData.plan)
              .single();

            if (planError) {
              console.error('Error validating plan:', planError);
              throw new Error(`Invalid plan: ${updateData.plan}`);
            }

            updateObject.plan = updateData.plan;
          }

          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(updateObject)
            .eq('id', updateData.id);

          if (profileError) {
            console.error('Error updating profile:', profileError);
            throw profileError;
          }
        }

        // Update role if provided
        if (updateData.role) {
          // Validate role against system_roles
          const { data: roleData, error: roleError } = await supabaseAdmin
            .from('system_roles')
            .select('name')
            .eq('name', updateData.role)
            .single();

          if (roleError) {
            console.error('Error validating role:', roleError);
            throw new Error(`Invalid role: ${updateData.role}`);
          }

          // First check if a role exists for this user
          const { data: existingRole, error: fetchError } = await supabaseAdmin
            .from('user_roles')
            .select()
            .eq('user_id', updateData.id)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
            console.error('Error fetching existing role:', fetchError);
            throw fetchError;
          }

          let error;
          if (existingRole) {
            // Update existing role
            const { error: updateError } = await supabaseAdmin
              .from('user_roles')
              .update({ role: updateData.role })
              .eq('user_id', updateData.id);
            error = updateError;
          } else {
            // Insert new role
            const { error: insertError } = await supabaseAdmin
              .from('user_roles')
              .insert({ user_id: updateData.id, role: updateData.role });
            error = insertError;
          }

          if (error) {
            console.error('Error updating role:', error);
            throw error;
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
      console.log('Starting deletion process for user:', userId);

      try {
        // STEP 1: Delete from profiles first (has no dependencies)
        console.log('Deleting user profile...');
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (profileError) {
          console.error('Error deleting profile:', profileError);
          throw profileError;
        }
        
        // STEP 2: Delete from user_roles
        console.log('Deleting user roles...');
        const { error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        if (rolesError) {
          console.error('Error deleting user roles:', rolesError);
          throw rolesError;
        }
        
        // STEP 3: Check for and delete any other related data
        // For example, delete any pet profiles, saved searches, or other user-specific data
        
        // Example: Delete pet profiles
        const { error: petProfilesError } = await supabaseAdmin
          .from('pet_profiles')
          .delete()
          .eq('user_id', userId);
          
        if (petProfilesError) {
          console.log('Warning: Error deleting pet profiles (or none exist):', petProfilesError);
          // Non-critical - continue with deletion
        }
        
        // Example: Delete saved searches
        const { error: savedSearchesError } = await supabaseAdmin
          .from('saved_searches')
          .delete()
          .eq('user_id', userId);
          
        if (savedSearchesError) {
          console.log('Warning: Error deleting saved searches (or none exist):', savedSearchesError);
          // Non-critical - continue with deletion
        }
        
        // Example: Delete route searches
        const { error: routeSearchesError } = await supabaseAdmin
          .from('route_searches')
          .delete()
          .eq('user_id', userId);
          
        if (routeSearchesError) {
          console.log('Warning: Error deleting route searches (or none exist):', routeSearchesError);
          // Non-critical - continue with deletion
        }

        // STEP 4: Finally delete the auth user
        console.log('Deleting auth user...');
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
          userId,
          false // Set soft delete to false to ensure hard deletion
        );
        
        if (deleteAuthError) {
          console.error('Error deleting auth user:', deleteAuthError);
          throw deleteAuthError;
        }

        console.log('User deleted successfully:', userId);
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

      // Split full name into first and last name
      const nameParts = profile?.full_name?.split(' ') || ['', ''];
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      const userProfile = {
        id: user.id,
        email: user.email || '',
        first_name: firstName,
        last_name: lastName,
        role: userRole?.role || 'pet_lover',
        plan: profile?.plan || 'free'
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
