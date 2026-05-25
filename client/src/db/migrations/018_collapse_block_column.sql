-- Collapse the negative block into one persisted column.
-- Existing 2NC cells (column 3) become Block cells.
-- Existing 1NR cells (column 4) are removed; later speeches shift left.

ALTER TABLE public.flow_cells
  DROP CONSTRAINT IF EXISTS flow_cells_column_index_check;

DELETE FROM public.flow_cells
WHERE column_index = 4;

UPDATE public.flow_cells
SET column_index = column_index - 1
WHERE column_index > 4;

ALTER TABLE public.flow_cells
  ADD CONSTRAINT flow_cells_column_index_check
  CHECK (column_index >= 0 AND column_index <= 6);
