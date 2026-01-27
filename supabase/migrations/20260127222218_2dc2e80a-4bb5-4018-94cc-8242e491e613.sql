-- Update the handle_auth_user function to add signup bonus credits for new accounts
CREATE OR REPLACE FUNCTION public.handle_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_signup_bonus integer := 25; -- Signup bonus credits
  v_free_monthly integer := 40; -- Free tier monthly credits
BEGIN
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
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    now(),
    now(),
    v_free_monthly,
    v_signup_bonus,
    'free',
    'free'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_login_at = now(),
    name = COALESCE(EXCLUDED.name, public.users.name),
    profile_image = COALESCE(EXCLUDED.profile_image, public.users.profile_image);
  
  -- Record the signup bonus transaction for new users only (not on conflict/update)
  IF NOT FOUND OR (SELECT created_at FROM public.users WHERE user_id = NEW.id) >= now() - interval '5 seconds' THEN
    INSERT INTO public.credit_transactions (user_id, amount, type, description, balance_after)
    SELECT NEW.id, v_signup_bonus, 'signup_bonus', 'Welcome bonus credits', v_free_monthly + v_signup_bonus
    WHERE NOT EXISTS (
      SELECT 1 FROM public.credit_transactions 
      WHERE user_id = NEW.id AND type = 'signup_bonus'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;