-- Migration: Add automatic user profile creation trigger
-- This ensures that when a user signs up via Supabase Auth,
-- a corresponding profile is automatically created in the users table

-- Function to auto-create user profile when auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
    NOW(),
    NOW()
  )
  ON CONFLICT (auth_id) DO NOTHING; -- Prevent duplicates if user already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile on auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Backfill: Create profiles for existing auth users that don't have profiles
INSERT INTO public.users (auth_id, email, name, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email, 'User'),
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.users u ON u.auth_id = au.id
WHERE u.id IS NULL
ON CONFLICT (auth_id) DO NOTHING;

