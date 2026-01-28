-- Add RESTRICTIVE policy to block anonymous access to users table
CREATE POLICY "Block anonymous access to users"
  ON public.users
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);

-- Add RESTRICTIVE policy to block anonymous access to profiles table
CREATE POLICY "Block anonymous access to profiles"
  ON public.profiles
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);