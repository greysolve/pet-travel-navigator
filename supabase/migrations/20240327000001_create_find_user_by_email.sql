
-- Create a function that securely looks up a user by exact email match
CREATE OR REPLACE FUNCTION public.find_user_by_email(user_email TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_record json;
BEGIN
  -- Query the auth.users table directly with exact email match
  SELECT json_build_object(
    'id', id,
    'email', email,
    'user_metadata', raw_user_meta_data
  )
  INTO user_record
  FROM auth.users
  WHERE email = user_email;
  
  RETURN user_record;
END;
$$;

-- Grant execute permission to authenticated and service role
GRANT EXECUTE ON FUNCTION public.find_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(TEXT) TO service_role;

COMMENT ON FUNCTION public.find_user_by_email IS 'Securely find a user by their exact email address';
