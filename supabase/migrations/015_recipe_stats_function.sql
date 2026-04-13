-- ============================================================
-- Recipe Stats Function (SECURITY DEFINER)
-- Returns aggregated stats per recipe: avg rating, rating count,
-- comment count, and favorite count (bypasses favorites RLS).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_recipe_stats(p_recipe_ids uuid[])
RETURNS TABLE(
  recipe_id uuid,
  avg_rating double precision,
  rating_count bigint,
  comment_count bigint,
  favorite_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    r.id AS recipe_id,
    AVG(ra.sterren)::double precision AS avg_rating,
    COUNT(DISTINCT ra.id) AS rating_count,
    (SELECT COUNT(*) FROM comments c WHERE c.recipe_id = r.id) AS comment_count,
    (SELECT COUNT(*) FROM favorites f WHERE f.recipe_id = r.id) AS favorite_count
  FROM unnest(p_recipe_ids) AS pid(id)
  JOIN recipes r ON r.id = pid.id
  LEFT JOIN ratings ra ON ra.recipe_id = r.id
  GROUP BY r.id;
$$;
