-- NEXUS-103: Delegation ratio split — council vs non-council tracking
--
-- Problem: The 70% BENDER delegation target is measured against ALL cards
-- including council/meta cards (which are DEA-only by policy). This makes
-- the metric misleading — structural DEA cards dilute the ratio.
--
-- Solution: Two views that separate council from non-council delegation ratios,
-- scoped to completed work (done cards) in the last 30 days and weekly trend.

-- ============================================================================
-- VIEW: delegation_ratio_by_scope
-- Computes BENDER% for council vs non-council cards (done, last 30 days).
-- ============================================================================
CREATE OR REPLACE VIEW delegation_ratio_by_scope AS
WITH base AS (
  SELECT
    c.card_id,
    c.delegation_tag,
    p.slug AS project_slug,
    c.completed_at,
    CASE WHEN p.slug = 'council' THEN 'council' ELSE 'non_council' END AS scope
  FROM nexus_cards c
  JOIN nexus_projects p ON p.id = c.project_id
  WHERE c.lane = 'done'
    AND c.completed_at >= now() - INTERVAL '30 days'
),
aggregated AS (
  SELECT
    scope,
    COUNT(*) AS total_cards,
    COUNT(*) FILTER (WHERE delegation_tag = 'BENDER') AS bender_cards,
    COUNT(*) FILTER (WHERE delegation_tag = 'DEA') AS dea_cards
  FROM base
  GROUP BY scope
),
overall AS (
  SELECT
    'overall' AS scope,
    COUNT(*) AS total_cards,
    COUNT(*) FILTER (WHERE delegation_tag = 'BENDER') AS bender_cards,
    COUNT(*) FILTER (WHERE delegation_tag = 'DEA') AS dea_cards
  FROM base
)
SELECT
  scope,
  total_cards,
  bender_cards,
  dea_cards,
  CASE
    WHEN total_cards = 0 THEN NULL
    ELSE ROUND((bender_cards::NUMERIC / total_cards) * 100, 1)
  END AS bender_pct,
  CASE
    WHEN total_cards = 0 THEN NULL
    ELSE ROUND((dea_cards::NUMERIC / total_cards) * 100, 1)
  END AS dea_pct
FROM aggregated

UNION ALL

SELECT
  scope,
  total_cards,
  bender_cards,
  dea_cards,
  CASE
    WHEN total_cards = 0 THEN NULL
    ELSE ROUND((bender_cards::NUMERIC / total_cards) * 100, 1)
  END AS bender_pct,
  CASE
    WHEN total_cards = 0 THEN NULL
    ELSE ROUND((dea_cards::NUMERIC / total_cards) * 100, 1)
  END AS dea_pct
FROM overall

ORDER BY scope;

-- ============================================================================
-- VIEW: delegation_trend_weekly
-- Weekly BENDER% for non-council work, last 8 weeks.
-- Enables trend visibility: is delegation ratio improving over time?
-- ============================================================================
CREATE OR REPLACE VIEW delegation_trend_weekly AS
SELECT
  DATE_TRUNC('week', c.completed_at) AS week_start,
  COUNT(*) AS total_cards,
  COUNT(*) FILTER (WHERE c.delegation_tag = 'BENDER') AS bender_cards,
  COUNT(*) FILTER (WHERE c.delegation_tag = 'DEA') AS dea_cards,
  CASE
    WHEN COUNT(*) = 0 THEN NULL
    ELSE ROUND((COUNT(*) FILTER (WHERE c.delegation_tag = 'BENDER')::NUMERIC / COUNT(*)) * 100, 1)
  END AS bender_pct
FROM nexus_cards c
JOIN nexus_projects p ON p.id = c.project_id
WHERE c.lane = 'done'
  AND p.slug != 'council'
  AND c.completed_at >= now() - INTERVAL '8 weeks'
GROUP BY DATE_TRUNC('week', c.completed_at)
ORDER BY week_start DESC;

-- ============================================================================
-- Usage examples:
--
-- All scopes at a glance:
--   SELECT * FROM delegation_ratio_by_scope;
--
-- Just non-council target tracking (70% BENDER goal):
--   SELECT bender_pct, dea_pct, total_cards
--   FROM delegation_ratio_by_scope
--   WHERE scope = 'non_council';
--
-- Weekly trend:
--   SELECT * FROM delegation_trend_weekly;
-- ============================================================================
