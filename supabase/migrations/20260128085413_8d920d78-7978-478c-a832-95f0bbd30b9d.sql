-- Fix the credit_transactions type constraint to allow signup_bonus
ALTER TABLE public.credit_transactions DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

ALTER TABLE public.credit_transactions ADD CONSTRAINT credit_transactions_type_check 
CHECK (type = ANY (ARRAY['subscription_reset', 'purchase', 'usage', 'refund', 'bonus', 'signup_bonus', 'admin_grant']::text[]));

-- Also ensure the foreign key uses auth.users correctly
-- The constraint already references auth.users(id) which is correct

-- Now manually create the missing user records for the test users
-- First check if they exist in auth but not in public.users

-- Create user records for any auth users that don't have public.users entries
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
SELECT 
  au.id,
  COALESCE(au.email, ''),
  COALESCE(au.raw_app_meta_data->>'provider', 'email'),
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'full_name', ''),
    NULLIF(au.raw_user_meta_data->>'name', ''),
    ''
  ),
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(au.raw_user_meta_data->>'picture', ''),
    ''
  ),
  au.created_at,
  now(),
  40,
  25,
  'free',
  'free'
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.user_id
WHERE pu.user_id IS NULL;