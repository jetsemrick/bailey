-- Add team_name for competitor tournaments (e.g., Kansas PS)
-- Run in Supabase SQL Editor if you have an existing database.

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS team_name text;
