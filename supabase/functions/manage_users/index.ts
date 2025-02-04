import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // First get all auth users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) throw authError

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
    if (profilesError) throw profilesError

    // Get all roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
    if (rolesError) throw rolesError

    // Start with auth users and enrich with profile and role data
    const userProfiles: UserProfile[] = users.map((user) => {
      const profile = profiles.find((p) => p.id === user.id)
      const userRole = roles.find((r) => r.user_id === user.id)
      
      return {
        id: user.id,
        full_name: profile?.full_name || null,
        email: user.email || '',
        role: userRole?.role || 'pet_lover',
      }
    })

    console.log('Returning user profiles:', userProfiles);

    return new Response(
      JSON.stringify(userProfiles),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in manage_users function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})