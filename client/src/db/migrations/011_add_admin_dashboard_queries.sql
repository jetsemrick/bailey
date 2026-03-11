DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.get_admin_user_summaries(
  page_limit integer DEFAULT 100,
  page_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  email text,
  role public.user_role,
  tournament_count bigint,
  round_count bigint,
  flow_count bigint,
  cell_count bigint,
  analytics_count bigint,
  last_activity_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.role,
    COALESCE(t.tournament_count, 0),
    COALESCE(r.round_count, 0),
    COALESCE(f.flow_count, 0),
    COALESCE(c.cell_count, 0),
    COALESCE(fa.analytics_count, 0) + COALESCE(ra.analytics_count, 0),
    (
      SELECT MAX(activity_at)
      FROM (
        VALUES
          (p.updated_at),
          (t.last_activity_at),
          (r.last_activity_at),
          (f.last_activity_at),
          (c.last_activity_at),
          (fa.last_activity_at),
          (ra.last_activity_at)
      ) AS activity(activity_at)
    ) AS last_activity_at,
    p.created_at
  FROM public.profiles AS p
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS tournament_count, MAX(updated_at) AS last_activity_at
    FROM public.tournaments
    WHERE user_id = p.id
  ) AS t ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS round_count, MAX(updated_at) AS last_activity_at
    FROM public.rounds
    WHERE user_id = p.id
  ) AS r ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS flow_count, MAX(updated_at) AS last_activity_at
    FROM public.flow_tabs
    WHERE user_id = p.id
  ) AS f ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS cell_count, MAX(updated_at) AS last_activity_at
    FROM public.flow_cells
    WHERE user_id = p.id
  ) AS c ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS analytics_count, MAX(updated_at) AS last_activity_at
    FROM public.flow_analytics
    WHERE user_id = p.id
  ) AS fa ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS analytics_count, MAX(updated_at) AS last_activity_at
    FROM public.round_analytics
    WHERE user_id = p.id
  ) AS ra ON true
  ORDER BY
    CASE WHEN p.role = 'Admin' THEN 0 ELSE 1 END,
    p.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_usage_metrics()
RETURNS TABLE (
  total_users bigint,
  admin_users bigint,
  active_users bigint,
  total_tournaments bigint,
  total_rounds bigint,
  total_flow_tabs bigint,
  total_flow_cells bigint,
  total_analytics_entries bigint,
  most_recent_activity_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  WITH activity AS (
    SELECT user_id, MAX(updated_at) AS last_activity_at
    FROM (
      SELECT user_id, updated_at FROM public.tournaments
      UNION ALL
      SELECT user_id, updated_at FROM public.rounds
      UNION ALL
      SELECT user_id, updated_at FROM public.flow_tabs
      UNION ALL
      SELECT user_id, updated_at FROM public.flow_cells
      UNION ALL
      SELECT user_id, updated_at FROM public.flow_analytics
      UNION ALL
      SELECT user_id, updated_at FROM public.round_analytics
    ) AS all_activity
    GROUP BY user_id
  )
  SELECT
    (SELECT COUNT(*)::bigint FROM public.profiles),
    (SELECT COUNT(*)::bigint FROM public.profiles WHERE role = 'Admin'),
    (SELECT COUNT(*)::bigint FROM activity),
    (SELECT COUNT(*)::bigint FROM public.tournaments),
    (SELECT COUNT(*)::bigint FROM public.rounds),
    (SELECT COUNT(*)::bigint FROM public.flow_tabs),
    (SELECT COUNT(*)::bigint FROM public.flow_cells),
    (
      (SELECT COUNT(*)::bigint FROM public.flow_analytics) +
      (SELECT COUNT(*)::bigint FROM public.round_analytics)
    ),
    (SELECT MAX(last_activity_at) FROM activity);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_user_summaries(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_usage_metrics() TO authenticated;
