-- CX tabs: set tab_kind in Postgres so the client never sends tab_kind in REST bodies.
-- PostgREST can return PGRST204 for tab_kind even when the column exists in Postgres (stale schema cache).
-- Run in Supabase SQL Editor after 015.

CREATE OR REPLACE FUNCTION public.flow_tabs_set_cx_from_position()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.position_name = 'CX' THEN
    NEW.tab_kind := 'cx';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS flow_tabs_cx_from_position ON public.flow_tabs;
CREATE TRIGGER flow_tabs_cx_from_position
  BEFORE INSERT ON public.flow_tabs
  FOR EACH ROW
  EXECUTE FUNCTION public.flow_tabs_set_cx_from_position();

NOTIFY pgrst, 'reload schema';
