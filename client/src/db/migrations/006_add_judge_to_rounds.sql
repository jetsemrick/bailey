-- Add judge field to rounds
-- Run in Supabase SQL Editor if you have an existing database.

ALTER TABLE rounds ADD COLUMN IF NOT EXISTS judge text DEFAULT '';
