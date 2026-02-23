-- Migration: Add comment column to flow_cells
-- This adds a comment field to store additional notes per cell

ALTER TABLE flow_cells ADD COLUMN IF NOT EXISTS comment text DEFAULT '';
