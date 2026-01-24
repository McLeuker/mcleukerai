-- Add subscription and credit columns to users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS monthly_credits integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_credits integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamp with time zone DEFAULT NULL;

-- Update credit_balance to be computed from monthly_credits + extra_credits
-- We'll keep credit_balance as a stored field for performance, updated via trigger

-- Create function to update credit_balance
CREATE OR REPLACE FUNCTION public.update_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.credit_balance = COALESCE(NEW.monthly_credits, 0) + COALESCE(NEW.extra_credits, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-update credit_balance
DROP TRIGGER IF EXISTS update_users_credit_balance ON public.users;
CREATE TRIGGER update_users_credit_balance
  BEFORE INSERT OR UPDATE OF monthly_credits, extra_credits ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_credit_balance();

-- Create credit_transactions table for audit trail
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('subscription_reset', 'purchase', 'usage', 'refund', 'bonus')),
  description text,
  balance_after integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.credit_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create function to deduct credits
CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id uuid, p_amount integer, p_description text DEFAULT 'AI usage')
RETURNS jsonb AS $$
DECLARE
  v_user record;
  v_new_monthly integer;
  v_new_extra integer;
  v_remaining integer;
  v_new_balance integer;
BEGIN
  -- Lock the user row for update
  SELECT monthly_credits, extra_credits, credit_balance 
  INTO v_user
  FROM public.users 
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF v_user.credit_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits', 'balance', v_user.credit_balance);
  END IF;
  
  -- First deduct from monthly_credits, then from extra_credits
  v_remaining = p_amount;
  v_new_monthly = v_user.monthly_credits;
  v_new_extra = v_user.extra_credits;
  
  IF v_new_monthly >= v_remaining THEN
    v_new_monthly = v_new_monthly - v_remaining;
    v_remaining = 0;
  ELSE
    v_remaining = v_remaining - v_new_monthly;
    v_new_monthly = 0;
    v_new_extra = v_new_extra - v_remaining;
  END IF;
  
  v_new_balance = v_new_monthly + v_new_extra;
  
  -- Update user credits
  UPDATE public.users 
  SET monthly_credits = v_new_monthly, extra_credits = v_new_extra
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description, balance_after)
  VALUES (p_user_id, -p_amount, 'usage', p_description, v_new_balance);
  
  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to add credits (for purchases)
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_amount integer, p_type text, p_description text DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  v_new_balance integer;
BEGIN
  IF p_type = 'subscription_reset' THEN
    -- For subscription reset, set monthly_credits to the new amount
    UPDATE public.users 
    SET monthly_credits = p_amount
    WHERE user_id = p_user_id;
  ELSE
    -- For purchases, add to extra_credits
    UPDATE public.users 
    SET extra_credits = extra_credits + p_amount
    WHERE user_id = p_user_id;
  END IF;
  
  SELECT credit_balance INTO v_new_balance FROM public.users WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description, balance_after)
  VALUES (p_user_id, p_amount, p_type, p_description, v_new_balance);
  
  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;