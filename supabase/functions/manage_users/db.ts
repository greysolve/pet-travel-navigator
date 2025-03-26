
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { UpdateUserData, UserProfile } from './types.ts';

// Initialize Supabase client with service role key for admin operations
export const getSupabaseAdmin = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

export async function updateUserProfile(supabaseAdmin, updateData: UpdateUserData) {
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
      await updateUserRole(supabaseAdmin, updateData.id, updateData.role);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in update operation:', error);
    throw error;
  }
}

export async function updateUserRole(supabaseAdmin, userId: string, role: string) {
  // Validate role against system_roles
  const { data: roleData, error: roleValidationError } = await supabaseAdmin
    .from('system_roles')
    .select('name')
    .eq('name', role)
    .single();

  if (roleValidationError) {
    console.error('Error validating role:', roleValidationError);
    throw new Error(`Invalid role: ${role}`);
  }

  // First check if a role exists for this user
  const { data: existingRole, error: fetchError } = await supabaseAdmin
    .from('user_roles')
    .select()
    .eq('user_id', userId)
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
      .update({ role })
      .eq('user_id', userId);
    error = updateError;
  } else {
    // Insert new role
    const { error: insertError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role });
    error = insertError;
  }

  if (error) {
    console.error('Error updating role:', error);
    throw error;
  }
  
  return { success: true };
}

export async function deleteUser(supabaseAdmin, userId: string) {
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
    await deleteUserRelatedData(supabaseAdmin, userId);
    
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
    return { success: true };
  } catch (error) {
    console.error('Error in delete operation:', error);
    throw error;
  }
}

async function deleteUserRelatedData(supabaseAdmin, userId: string) {
  // Delete pet profiles
  const { error: petProfilesError } = await supabaseAdmin
    .from('pet_profiles')
    .delete()
    .eq('user_id', userId);
    
  if (petProfilesError) {
    console.log('Warning: Error deleting pet profiles (or none exist):', petProfilesError);
    // Non-critical - continue with deletion
  }
  
  // Delete saved searches
  const { error: savedSearchesError } = await supabaseAdmin
    .from('saved_searches')
    .delete()
    .eq('user_id', userId);
    
  if (savedSearchesError) {
    console.log('Warning: Error deleting saved searches (or none exist):', savedSearchesError);
    // Non-critical - continue with deletion
  }
  
  // Delete route searches
  const { error: routeSearchesError } = await supabaseAdmin
    .from('route_searches')
    .delete()
    .eq('user_id', userId);
    
  if (routeSearchesError) {
    console.log('Warning: Error deleting route searches (or none exist):', routeSearchesError);
    // Non-critical - continue with deletion
  }
}

export async function fetchUsers(supabaseAdmin) {
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
  return userProfiles;
}
