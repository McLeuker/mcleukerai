-- Create users table for authentication data
CREATE TABLE public.users (
  user_id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  auth_provider TEXT NOT NULL DEFAULT 'email',
  name TEXT,
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subscription_status TEXT NOT NULL DEFAULT 'free',
  credit_balance INTEGER NOT NULL DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own data" 
ON public.users 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own data" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user creation and update last login
CREATE OR REPLACE FUNCTION public.handle_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, email, auth_provider, name, profile_image, created_at, last_login_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_login_at = now(),
    name = COALESCE(EXCLUDED.name, public.users.name),
    profile_image = COALESCE(EXCLUDED.profile_image, public.users.profile_image);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user();

-- Create function to update last login on sign in
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users 
  SET last_login_at = now()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to update updated_at column
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();