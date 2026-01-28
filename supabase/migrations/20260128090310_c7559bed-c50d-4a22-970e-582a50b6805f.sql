-- Fix 1: Add missing UPDATE and DELETE policies for research_sources table
CREATE POLICY "Users can update sources for their tasks" 
  ON public.research_sources FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.research_tasks 
    WHERE research_tasks.id = research_sources.task_id 
    AND research_tasks.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete sources for their tasks" 
  ON public.research_sources FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.research_tasks 
    WHERE research_tasks.id = research_sources.task_id 
    AND research_tasks.user_id = auth.uid()
  ));

-- Fix 2: Harden deduct_credits function to prevent cross-user manipulation
CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id uuid, p_amount integer, p_description text DEFAULT 'AI usage'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user record;
  v_new_monthly integer;
  v_new_extra integer;
  v_remaining integer;
  v_new_balance integer;
BEGIN
  -- Security check: prevent authenticated users from modifying other users' credits
  -- Service role calls (from edge functions) have auth.uid() = NULL, so they bypass this check
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Cannot modify credits for other users';
  END IF;

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
$function$;

-- Fix 2: Harden add_credits function to prevent cross-user manipulation
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_amount integer, p_type text, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_balance integer;
BEGIN
  -- Security check: prevent authenticated users from modifying other users' credits
  -- Service role calls (from edge functions) have auth.uid() = NULL, so they bypass this check
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Cannot modify credits for other users';
  END IF;

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
$function$;