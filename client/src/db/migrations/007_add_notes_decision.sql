-- Add notes_decision for judge mode "Reason for Decision"
-- Run in Supabase SQL Editor if you have an existing database.

ALTER TABLE round_analytics ADD COLUMN IF NOT EXISTS notes_decision text DEFAULT '';
