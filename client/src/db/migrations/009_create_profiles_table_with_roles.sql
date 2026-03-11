DO $$
BEGIN
  CREATE TYPE user_role AS ENUM ('Admin', 'User');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'User',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN public.is_admin_email(NEW.email) THEN 'Admin'::public.user_role
      ELSE 'User'::public.user_role
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    role = CASE
      WHEN public.is_admin_email(EXCLUDED.email) THEN 'Admin'::public.user_role
      ELSE profiles.role
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;

INSERT INTO public.profiles (id, email, role)
SELECT
  users.id,
  users.email,
  CASE
    WHEN public.is_admin_email(users.email) THEN 'Admin'::public.user_role
    ELSE 'User'::public.user_role
  END
FROM auth.users AS users
WHERE users.email IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  role = CASE
    WHEN public.is_admin_email(EXCLUDED.email) THEN 'Admin'::public.user_role
    ELSE profiles.role
  END,
  updated_at = now();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
