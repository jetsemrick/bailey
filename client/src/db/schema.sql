-- Bailey Database Schema
-- Run this SQL in the Supabase SQL Editor to set up the database.
-- This drops any existing old tables (flows, sheets, cells) from the previous schema.

-- Drop old tables if they exist
DROP TABLE IF EXISTS cells CASCADE;
DROP TABLE IF EXISTS sheets CASCADE;
DROP TABLE IF EXISTS flows CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS prevent_role_self_escalation ON profiles;
DROP FUNCTION IF EXISTS get_platform_usage_metrics();
DROP FUNCTION IF EXISTS get_admin_user_summaries(integer, integer);
DROP FUNCTION IF EXISTS get_admin_user_summaries();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_admin_email(text);
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS prevent_role_self_escalation();

-- Drop new tables if re-running
DROP TABLE IF EXISTS keyboard_macros CASCADE;
DROP TABLE IF EXISTS round_analytics CASCADE;
DROP TABLE IF EXISTS flow_analytics CASCADE;
DROP TABLE IF EXISTS flow_cells CASCADE;
DROP TABLE IF EXISTS flow_tabs CASCADE;
DROP TABLE IF EXISTS rounds CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS admin_emails CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ============================================================
-- Tables
-- ============================================================

CREATE TYPE user_role AS ENUM ('Admin', 'User');

CREATE TABLE admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'User',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Tournament',
  date text,
  location text,
  tournament_type text CHECK (tournament_type IN ('judge', 'competitor')) DEFAULT 'competitor',
  team_name text,
  timer_preset text CHECK (timer_preset IN ('college', 'high_school')) DEFAULT 'high_school',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  round_number integer NOT NULL DEFAULT 1,
  opponent text DEFAULT '',
  team_aff text DEFAULT '',
  team_neg text DEFAULT '',
  side text CHECK (side IN ('aff', 'neg')) DEFAULT 'aff',
  result text CHECK (result IN ('W', 'L') OR result IS NULL),
  judge text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE flow_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  round_id uuid REFERENCES rounds(id) ON DELETE CASCADE NOT NULL,
  position_name text NOT NULL DEFAULT 'Untitled',
  initiated_by text CHECK (initiated_by IN ('aff', 'neg')) DEFAULT 'aff',
  tab_kind text CHECK (tab_kind IN ('standard', 'cx')) DEFAULT 'standard',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS flow_tabs_one_cx_per_round
  ON flow_tabs (round_id)
  WHERE tab_kind = 'cx';

-- CX tabs: set tab_kind in DB when position_name is CX (client omits tab_kind for PostgREST compatibility).
CREATE OR REPLACE FUNCTION public.flow_tabs_set_cx_from_position()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.position_name = 'CX' THEN
    NEW.tab_kind := 'cx';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER flow_tabs_cx_from_position
  BEFORE INSERT ON flow_tabs
  FOR EACH ROW
  EXECUTE FUNCTION public.flow_tabs_set_cx_from_position();

CREATE TABLE flow_cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  flow_id uuid REFERENCES flow_tabs(id) ON DELETE CASCADE NOT NULL,
  column_index integer NOT NULL CHECK (column_index >= 0 AND column_index <= 7),
  row_index integer NOT NULL CHECK (row_index >= 0),
  content text DEFAULT '',
  color text CHECK (color IN ('yellow', 'green', 'blue') OR color IS NULL),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(flow_id, column_index, row_index)
);

CREATE TABLE flow_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  flow_id uuid REFERENCES flow_tabs(id) ON DELETE CASCADE NOT NULL UNIQUE,
  notes_aff text DEFAULT '',
  notes_neg text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE round_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  round_id uuid REFERENCES rounds(id) ON DELETE CASCADE NOT NULL UNIQUE,
  notes_aff text DEFAULT '',
  notes_neg text DEFAULT '',
  notes_decision text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE keyboard_macros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  macros jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_tournaments_user ON tournaments(user_id);
CREATE INDEX idx_rounds_tournament ON rounds(tournament_id);
CREATE INDEX idx_rounds_user ON rounds(user_id);
CREATE INDEX idx_flow_tabs_round ON flow_tabs(round_id);
CREATE INDEX idx_flow_tabs_user ON flow_tabs(user_id);
CREATE INDEX idx_flow_cells_flow ON flow_cells(flow_id);
CREATE INDEX idx_flow_cells_user ON flow_cells(user_id);
CREATE INDEX idx_flow_analytics_flow ON flow_analytics(flow_id);
CREATE INDEX idx_flow_analytics_user ON flow_analytics(user_id);
CREATE INDEX idx_round_analytics_round ON round_analytics(round_id);
CREATE INDEX idx_round_analytics_user ON round_analytics(user_id);
CREATE INDEX idx_keyboard_macros_user ON keyboard_macros(user_id);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE admin_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyboard_macros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users manage own tournaments" ON tournaments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own rounds" ON rounds
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own flows" ON flow_tabs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own cells" ON flow_cells
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own flow analytics" ON flow_analytics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own round analytics" ON round_analytics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own macros" ON keyboard_macros
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Admin helpers and auth profile sync
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid() AND role = 'Admin'
  );
END;
$$;

CREATE POLICY "Only admins can view admin_emails" ON admin_emails
  FOR SELECT USING (is_admin());

CREATE POLICY "Only admins can manage admin_emails" ON admin_emails
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION is_admin_email(check_email text)
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

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN is_admin_email(NEW.email) THEN 'Admin'::user_role
      ELSE 'User'::user_role
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    role = CASE
      WHEN is_admin_email(EXCLUDED.email) THEN 'Admin'::user_role
      ELSE profiles.role
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT is_admin() OR auth.uid() = NEW.id THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_role_self_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_self_escalation();

INSERT INTO profiles (id, email, role)
SELECT
  users.id,
  users.email,
  CASE
    WHEN is_admin_email(users.email) THEN 'Admin'::user_role
    ELSE 'User'::user_role
  END
FROM auth.users AS users
WHERE users.email IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  role = CASE
    WHEN is_admin_email(EXCLUDED.email) THEN 'Admin'::user_role
    ELSE profiles.role
  END,
  updated_at = now();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

CREATE OR REPLACE FUNCTION get_admin_user_summaries(
  page_limit integer DEFAULT 100,
  page_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  email text,
  role user_role,
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
  IF NOT is_admin() THEN
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
  FROM profiles AS p
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS tournament_count, MAX(updated_at) AS last_activity_at
    FROM tournaments
    WHERE user_id = p.id
  ) AS t ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS round_count, MAX(updated_at) AS last_activity_at
    FROM rounds
    WHERE user_id = p.id
  ) AS r ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS flow_count, MAX(updated_at) AS last_activity_at
    FROM flow_tabs
    WHERE user_id = p.id
  ) AS f ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS cell_count, MAX(updated_at) AS last_activity_at
    FROM flow_cells
    WHERE user_id = p.id
  ) AS c ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS analytics_count, MAX(updated_at) AS last_activity_at
    FROM flow_analytics
    WHERE user_id = p.id
  ) AS fa ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS analytics_count, MAX(updated_at) AS last_activity_at
    FROM round_analytics
    WHERE user_id = p.id
  ) AS ra ON true
  ORDER BY
    CASE WHEN p.role = 'Admin' THEN 0 ELSE 1 END,
    p.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

CREATE OR REPLACE FUNCTION get_platform_usage_metrics()
RETURNS TABLE (
  total_users bigint,
  admin_users bigint,
  active_users bigint,
  total_tournaments bigint,
  total_rounds bigint,
  total_flow_tabs bigint,
  total_flow_cells bigint,
  total_analytics_entries bigint,
  most_recent_activity_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  WITH activity AS (
    SELECT user_id, MAX(updated_at) AS last_activity_at
    FROM (
      SELECT user_id, updated_at FROM tournaments
      UNION ALL
      SELECT user_id, updated_at FROM rounds
      UNION ALL
      SELECT user_id, updated_at FROM flow_tabs
      UNION ALL
      SELECT user_id, updated_at FROM flow_cells
      UNION ALL
      SELECT user_id, updated_at FROM flow_analytics
      UNION ALL
      SELECT user_id, updated_at FROM round_analytics
    ) AS all_activity
    GROUP BY user_id
  )
  SELECT
    (SELECT COUNT(*)::bigint FROM profiles),
    (SELECT COUNT(*)::bigint FROM profiles WHERE role = 'Admin'),
    (SELECT COUNT(*)::bigint FROM activity),
    (SELECT COUNT(*)::bigint FROM tournaments),
    (SELECT COUNT(*)::bigint FROM rounds),
    (SELECT COUNT(*)::bigint FROM flow_tabs),
    (SELECT COUNT(*)::bigint FROM flow_cells),
    (
      (SELECT COUNT(*)::bigint FROM flow_analytics) +
      (SELECT COUNT(*)::bigint FROM round_analytics)
    ),
    (SELECT MAX(last_activity_at) FROM activity);
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_user_summaries(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_usage_metrics() TO authenticated;

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tournaments_updated_at
  BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER rounds_updated_at
  BEFORE UPDATE ON rounds FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER flow_tabs_updated_at
  BEFORE UPDATE ON flow_tabs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER flow_cells_updated_at
  BEFORE UPDATE ON flow_cells FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER flow_analytics_updated_at
  BEFORE UPDATE ON flow_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER round_analytics_updated_at
  BEFORE UPDATE ON round_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER keyboard_macros_updated_at
  BEFORE UPDATE ON keyboard_macros FOR EACH ROW EXECUTE FUNCTION update_updated_at();
