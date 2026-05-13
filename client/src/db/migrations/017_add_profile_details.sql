-- Add editable profile details and a default debate team/code.
-- Run in Supabase SQL Editor for existing databases.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS default_team_code text;

UPDATE public.profiles AS profiles
SET
  first_name = COALESCE(profiles.first_name, NULLIF(users.raw_user_meta_data->>'first_name', '')),
  last_name = COALESCE(profiles.last_name, NULLIF(users.raw_user_meta_data->>'last_name', ''))
FROM auth.users AS users
WHERE profiles.id = users.id;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN public.is_admin_email(NEW.email) THEN 'Admin'::public.user_role
      ELSE 'User'::public.user_role
    END,
    NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    role = CASE
      WHEN public.is_admin_email(EXCLUDED.email) THEN 'Admin'::public.user_role
      ELSE profiles.role
    END,
    first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
    last_name = COALESCE(profiles.last_name, EXCLUDED.last_name),
    updated_at = now();

  RETURN NEW;
END;
$$;
