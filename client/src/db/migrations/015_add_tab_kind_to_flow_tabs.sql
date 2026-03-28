-- CX flow tab: at most one per round (DEB-28)
-- Run in Supabase SQL Editor if you have an existing database.

ALTER TABLE flow_tabs ADD COLUMN IF NOT EXISTS tab_kind text
  CHECK (tab_kind IN ('standard', 'cx')) DEFAULT 'standard';

CREATE UNIQUE INDEX IF NOT EXISTS flow_tabs_one_cx_per_round
  ON flow_tabs (round_id)
  WHERE tab_kind = 'cx';
