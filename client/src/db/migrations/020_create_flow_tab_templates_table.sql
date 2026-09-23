-- Create flow_tab_templates table for user-saved tab templates
-- Run this SQL in the Supabase SQL Editor to enable flow tab templates.

CREATE TABLE IF NOT EXISTS flow_tab_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  tabs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT flow_tab_templates_name_unique UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_flow_tab_templates_user ON flow_tab_templates(user_id);

-- Row Level Security
ALTER TABLE flow_tab_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own templates" ON flow_tab_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER flow_tab_templates_updated_at
  BEFORE UPDATE ON flow_tab_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE flow_tab_templates IS 
  'User-saved flow tab templates for quick round setup. Each template contains an array of tab definitions.';

COMMENT ON COLUMN flow_tab_templates.tabs IS 
  'JSON array of tab definitions: [{ position_name: string, initiated_by: "aff" | "neg", tab_kind?: "standard" | "cx" }]';
