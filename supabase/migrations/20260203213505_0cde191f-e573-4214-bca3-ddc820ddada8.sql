-- Fix: Remove overly permissive "Service role full access" policy on users table
-- This policy allows unrestricted access when it should be restricted to actual service role operations

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role full access" ON public.users;

-- The existing user-specific policies remain:
-- - "Users can insert their own data" (INSERT with auth.uid() = user_id)
-- - "Users can update their own data" (UPDATE with auth.uid() = user_id)  
-- - "Users can view their own data" (SELECT with auth.uid() = user_id)

-- These policies correctly restrict access to only the authenticated user's own data
-- Service role operations from edge functions bypass RLS by default when using SUPABASE_SERVICE_ROLE_KEY