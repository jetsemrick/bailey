-- Migration: Add profiles table with user roles for admin dashboard
-- This migration creates the profiles table, is_admin() function, and RLS policies.

-- Create user_role enum type
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('Admin', 'User');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role user_role DEFAULT 'User' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Admin'
  );
END;
$$;

-- RLS policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admin read policies for other tables (for usage stats)
DROP POLICY IF EXISTS "Admins can view all tournaments" ON tournaments;
CREATE POLICY "Admins can view all tournaments" ON tournaments
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can view all rounds" ON rounds;
CREATE POLICY "Admins can view all rounds" ON rounds
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can view all flow_tabs" ON flow_tabs;
CREATE POLICY "Admins can view all flow_tabs" ON flow_tabs
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can view all flow_cells" ON flow_cells;
CREATE POLICY "Admins can view all flow_cells" ON flow_cells
  FOR SELECT USING (is_admin());

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'User')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at trigger for profiles
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Grant Admin role to jet.semrick@gmail.com (if exists)
UPDATE profiles SET role = 'Admin' WHERE email = 'jet.semrick@gmail.com';
