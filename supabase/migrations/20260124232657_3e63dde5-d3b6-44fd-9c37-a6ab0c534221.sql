-- Add model_used column to tasks table to store which AI model was used
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS model_used TEXT DEFAULT NULL;

-- Add credits_used column to track how many credits the task consumed
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT NULL;