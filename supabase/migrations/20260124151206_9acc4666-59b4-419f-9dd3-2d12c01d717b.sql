-- Add refills_this_month column to track monthly refill limits
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS refills_this_month integer DEFAULT 0;

-- Update existing rows to have 0 refills
UPDATE public.users SET refills_this_month = 0 WHERE refills_this_month IS NULL;