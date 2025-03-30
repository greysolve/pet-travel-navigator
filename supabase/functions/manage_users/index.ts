
import { corsHeaders } from './cors.ts'
import { getSupabaseAdmin, updateUserProfile, deleteUser, fetchUsers } from './db.ts';
import type { UpdateUserData } from './types.ts';

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
    const supabaseAdmin = getSupabaseAdmin();

    // Handle PATCH request for user updates
    if (req.method === 'PATCH') {
      const updateData: UpdateUserData = await req.json();
      try {
        await updateUserProfile(supabaseAdmin, updateData);
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
        await deleteUser(supabaseAdmin, userId);
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
    const userProfiles = await fetchUsers(supabaseAdmin);

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
