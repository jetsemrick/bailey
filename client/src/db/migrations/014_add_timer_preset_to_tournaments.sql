-- Debate timer preset: college vs high school speech lengths (DEB-29)
-- Run in Supabase SQL Editor if you have an existing database.

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS timer_preset text
  CHECK (timer_preset IN ('college', 'high_school')) DEFAULT 'high_school';
