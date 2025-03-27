
-- Add index to support faster exact email matches on auth.users
CREATE INDEX IF NOT EXISTS idx_auth_users_email_lower ON auth.users (LOWER(email));

-- Update find_user_by_email function to use lower() for case-insensitive matching
CREATE OR REPLACE FUNCTION public.find_user_by_email(user_email TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_record json;
BEGIN
  -- Query the auth.users table with case-insensitive email match
  SELECT json_build_object(
    'id', id,
    'email', email,
    'user_metadata', raw_user_meta_data
  )
  INTO user_record
  FROM auth.users
  WHERE LOWER(email) = LOWER(user_email);
  
  RETURN user_record;
END;
$$;

-- Re-grant execute permission
GRANT EXECUTE ON FUNCTION public.find_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(TEXT) TO service_role;

COMMENT ON FUNCTION public.find_user_by_email IS 'Securely find a user by their exact email address (case insensitive)';
