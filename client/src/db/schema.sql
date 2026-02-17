-- Bailey Database Schema
-- Run this SQL in the Supabase SQL Editor to set up the database.
-- This drops any existing old tables (flows, sheets, cells) from the previous schema.

-- Drop old tables if they exist
DROP TABLE IF EXISTS cells CASCADE;
DROP TABLE IF EXISTS sheets CASCADE;
DROP TABLE IF EXISTS flows CASCADE;

-- Drop new tables if re-running
DROP TABLE IF EXISTS flow_analytics CASCADE;
DROP TABLE IF EXISTS flow_cells CASCADE;
DROP TABLE IF EXISTS flow_tabs CASCADE;
DROP TABLE IF EXISTS rounds CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Untitled Tournament',
  date text,
  location text,
  tournament_type text CHECK (tournament_type IN ('judge', 'competitor')) DEFAULT 'competitor',
  team_name text,
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE flow_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  round_id uuid REFERENCES rounds(id) ON DELETE CASCADE NOT NULL,
  position_name text NOT NULL DEFAULT 'Untitled',
  initiated_by text CHECK (initiated_by IN ('aff', 'neg')) DEFAULT 'aff',
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE flow_cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  flow_id uuid REFERENCES flow_tabs(id) ON DELETE CASCADE NOT NULL,
  column_index integer NOT NULL CHECK (column_index >= 0 AND column_index <= 7),
  row_index integer NOT NULL CHECK (row_index >= 0),
  content text DEFAULT '',
  color text CHECK (color IN ('yellow', 'green', 'blue') OR color IS NULL),
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

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_tournaments_user ON tournaments(user_id);
CREATE INDEX idx_rounds_tournament ON rounds(tournament_id);
CREATE INDEX idx_rounds_user ON rounds(user_id);
CREATE INDEX idx_flow_tabs_round ON flow_tabs(round_id);
CREATE INDEX idx_flow_tabs_user ON flow_tabs(user_id);
CREATE INDEX idx_flow_cells_flow ON flow_cells(flow_id);
CREATE INDEX idx_flow_cells_user ON flow_cells(user_id);
CREATE INDEX idx_flow_analytics_flow ON flow_analytics(flow_id);
CREATE INDEX idx_flow_analytics_user ON flow_analytics(user_id);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_analytics ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER rounds_updated_at
  BEFORE UPDATE ON rounds FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER flow_tabs_updated_at
  BEFORE UPDATE ON flow_tabs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER flow_cells_updated_at
  BEFORE UPDATE ON flow_cells FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER flow_analytics_updated_at
  BEFORE UPDATE ON flow_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
