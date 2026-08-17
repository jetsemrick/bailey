-- Migration 019: Add RPC for atomic flow tab reordering
-- Resolves DEB-62: Batch flow tab reorder updates atomically

CREATE OR REPLACE FUNCTION public.reorder_flow_tabs(
  updates jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
  tab_id uuid;
  new_order integer;
  current_user_id uuid;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Process each update in the array
  FOR item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    tab_id := (item->>'id')::uuid;
    new_order := (item->>'display_order')::integer;
    
    -- Verify the user owns this flow tab before updating
    -- This enforces RLS at the function level since we're using SECURITY DEFINER
    IF NOT EXISTS (
      SELECT 1 FROM flow_tabs 
      WHERE id = tab_id 
      AND user_id = current_user_id
    ) THEN
      RAISE EXCEPTION 'Flow tab not found or access denied: %', tab_id;
    END IF;
    
    -- Update the display order
    UPDATE flow_tabs
    SET display_order = new_order,
        updated_at = now()
    WHERE id = tab_id
    AND user_id = current_user_id;
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.reorder_flow_tabs(jsonb) TO authenticated;

COMMENT ON FUNCTION public.reorder_flow_tabs(jsonb) IS 
  'Atomically update display_order for multiple flow tabs. Expects a JSON array of {id, display_order} objects. Enforces user ownership via RLS checks.';
