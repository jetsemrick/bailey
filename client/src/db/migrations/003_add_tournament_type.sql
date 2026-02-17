-- Add tournament_type: judge or competitor
-- Run in Supabase SQL Editor if you have an existing database.

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS tournament_type text CHECK (tournament_type IN ('judge', 'competitor')) DEFAULT 'competitor';
