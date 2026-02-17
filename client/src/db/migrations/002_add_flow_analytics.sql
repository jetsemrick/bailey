-- Flow analytics: notes and analytics per flow
-- Run in Supabase SQL Editor if you have an existing database.

CREATE TABLE IF NOT EXISTS flow_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  flow_id uuid REFERENCES flow_tabs(id) ON DELETE CASCADE NOT NULL UNIQUE,
  notes_aff text DEFAULT '',
  notes_neg text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flow_analytics_flow ON flow_analytics(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_analytics_user ON flow_analytics(user_id);

ALTER TABLE flow_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own flow analytics" ON flow_analytics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER flow_analytics_updated_at
  BEFORE UPDATE ON flow_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
