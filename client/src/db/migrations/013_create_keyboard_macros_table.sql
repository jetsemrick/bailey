-- Keyboard macros per user (JSONB blob)
-- Run in Supabase SQL Editor if you have an existing database.

CREATE TABLE keyboard_macros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  macros jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_keyboard_macros_user ON keyboard_macros(user_id);

ALTER TABLE keyboard_macros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own macros"
  ON keyboard_macros FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER keyboard_macros_updated_at
  BEFORE UPDATE ON keyboard_macros FOR EACH ROW EXECUTE FUNCTION update_updated_at();
