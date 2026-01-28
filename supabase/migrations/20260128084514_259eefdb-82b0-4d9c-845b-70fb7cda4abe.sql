-- Fix handle_auth_user function to be more robust and handle all edge cases
CREATE OR REPLACE FUNCTION public.handle_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_signup_bonus integer := 25;
  v_free_monthly integer := 40;
  v_user_exists boolean;
BEGIN
  -- Check if user already exists
  SELECT EXISTS(SELECT 1 FROM public.users WHERE user_id = NEW.id) INTO v_user_exists;
  
  IF v_user_exists THEN
    -- User exists, just update last_login
    UPDATE public.users 
    SET 
      last_login_at = now(),
      name = COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        name
      ),
      profile_image = COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
        NULLIF(NEW.raw_user_meta_data->>'picture', ''),
        profile_image
      )
    WHERE user_id = NEW.id;
  ELSE
    -- New user, create record with credits
    INSERT INTO public.users (
      user_id, 
      email, 
      auth_provider, 
      name, 
      profile_image, 
      created_at, 
      last_login_at,
      monthly_credits,
      extra_credits,
      subscription_plan,
      subscription_status
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
      COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        ''
      ),
      COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
        NULLIF(NEW.raw_user_meta_data->>'picture', ''),
        ''
      ),
      now(),
      now(),
      v_free_monthly,
      v_signup_bonus,
      'free',
      'free'
    );
    
    -- Record the signup bonus transaction
    INSERT INTO public.credit_transactions (user_id, amount, type, description, balance_after)
    VALUES (NEW.id, v_signup_bonus, 'signup_bonus', 'Welcome bonus credits', v_free_monthly + v_signup_bonus);
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth process
  RAISE WARNING 'Error in handle_auth_user: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Ensure the trigger uses AFTER INSERT so auth completes first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user();

-- Create or replace the login update trigger
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update last login time safely
  UPDATE public.users 
  SET last_login_at = now()
  WHERE user_id = NEW.id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail auth on login update errors
  RAISE WARNING 'Error in update_last_login: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Ensure proper RLS policies for users table - allow trigger operations
-- Drop and recreate policies to ensure clean state
DROP POLICY IF EXISTS "Block anonymous access to users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;

-- Recreate with correct permissions
CREATE POLICY "Users can view their own data"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Service role bypass for triggers (critical for signup)
CREATE POLICY "Service role full access"
ON public.users FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix profiles table policies similarly
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to profiles"
ON public.profiles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);