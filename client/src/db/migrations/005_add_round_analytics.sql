-- Round analytics: notes per round (used when no flow tabs exist)
-- Run in Supabase SQL Editor if you have an existing database.

CREATE TABLE IF NOT EXISTS round_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  round_id uuid REFERENCES rounds(id) ON DELETE CASCADE NOT NULL UNIQUE,
  notes_aff text DEFAULT '',
  notes_neg text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_round_analytics_round ON round_analytics(round_id);
CREATE INDEX IF NOT EXISTS idx_round_analytics_user ON round_analytics(user_id);

ALTER TABLE round_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own round analytics" ON round_analytics
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER round_analytics_updated_at
  BEFORE UPDATE ON round_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
