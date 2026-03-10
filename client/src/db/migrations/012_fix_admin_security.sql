-- Migration 012: Fix admin security issues
-- 1. Prevent role self-escalation via trigger
-- 2. Add LIMIT to get_admin_user_summaries()
-- 3. Replace hardcoded admin email with config table

-- ============================================================
-- Create admin_emails configuration table
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view admin_emails" ON admin_emails
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Only admins can manage admin_emails" ON admin_emails
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- Create function to check if email is admin
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_email(check_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_emails WHERE lower(email) = lower(check_email)
  );
END;
$$;

-- ============================================================
-- Trigger to prevent role self-modification
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT public.is_admin() OR auth.uid() = NEW.id THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_self_escalation ON public.profiles;
CREATE TRIGGER prevent_role_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- ============================================================
-- Update handle_new_user to use admin_emails table
-- ============================================================

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

-- ============================================================
-- Update get_admin_user_summaries with LIMIT/OFFSET
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_user_summaries(
  page_limit integer DEFAULT 100,
  page_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  email text,
  role public.user_role,
  tournament_count bigint,
  round_count bigint,
  flow_count bigint,
  cell_count bigint,
  analytics_count bigint,
  last_activity_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.role,
    COALESCE(t.tournament_count, 0),
    COALESCE(r.round_count, 0),
    COALESCE(f.flow_count, 0),
    COALESCE(c.cell_count, 0),
    COALESCE(fa.analytics_count, 0) + COALESCE(ra.analytics_count, 0),
    (
      SELECT MAX(activity_at)
      FROM (
        VALUES
          (p.updated_at),
          (t.last_activity_at),
          (r.last_activity_at),
          (f.last_activity_at),
          (c.last_activity_at),
          (fa.last_activity_at),
          (ra.last_activity_at)
      ) AS activity(activity_at)
    ) AS last_activity_at,
    p.created_at
  FROM public.profiles AS p
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS tournament_count, MAX(updated_at) AS last_activity_at
    FROM public.tournaments
    WHERE user_id = p.id
  ) AS t ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS round_count, MAX(updated_at) AS last_activity_at
    FROM public.rounds
    WHERE user_id = p.id
  ) AS r ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS flow_count, MAX(updated_at) AS last_activity_at
    FROM public.flow_tabs
    WHERE user_id = p.id
  ) AS f ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS cell_count, MAX(updated_at) AS last_activity_at
    FROM public.flow_cells
    WHERE user_id = p.id
  ) AS c ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS analytics_count, MAX(updated_at) AS last_activity_at
    FROM public.flow_analytics
    WHERE user_id = p.id
  ) AS fa ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS analytics_count, MAX(updated_at) AS last_activity_at
    FROM public.round_analytics
    WHERE user_id = p.id
  ) AS ra ON true
  ORDER BY
    CASE WHEN p.role = 'Admin' THEN 0 ELSE 1 END,
    p.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;
