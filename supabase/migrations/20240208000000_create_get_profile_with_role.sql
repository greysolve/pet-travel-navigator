
-- Create a function to get profile with role in a single transaction
create or replace function public.get_profile_with_role(user_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  profile_data json;
  user_role text;
  result json;
begin
  -- Get profile data
  select row_to_json(p)
  into profile_data
  from profiles p
  where p.id = user_id;

  -- Get user role
  select role::text
  into user_role
  from user_roles
  where user_roles.user_id = user_id;

  -- Combine the results
  select json_build_object(
    'profile', profile_data,
    'role', user_role
  ) into result;

  return result;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_profile_with_role(uuid) to authenticated;

