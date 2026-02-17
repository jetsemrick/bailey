-- Add team_aff and team_neg to rounds for "X v. X" display
-- Run in Supabase SQL Editor if you have an existing database.

ALTER TABLE rounds ADD COLUMN IF NOT EXISTS team_aff text DEFAULT '';
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS team_neg text DEFAULT '';
