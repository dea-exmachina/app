-- NEXUS-104: Add task_type to bender_performance
--
-- Problem: bender_performance has no task_type column. Performance data cannot
-- be segmented by what type of work a bender is doing, making it impossible to
-- identify where specific benders excel or degrade (e.g., Atlas good at research,
-- weak at bug fixes).
--
-- Solution: Add task_type column to bender_performance. Populate from the
-- card_type of the referenced nexus_cards entry where the task_id matches.
-- Create bender_performance_by_type view for per-bender, per-type analytics.
--
-- Valid task_type values (from nexus_cards.card_type CHECK constraint):
-- epic, task, bug, chore, research, article

-- ============================================================================
-- ALTER: bender_performance — add task_type column
-- ============================================================================
ALTER TABLE bender_performance
  ADD COLUMN IF NOT EXISTS task_type TEXT
    CHECK (task_type IN ('epic', 'task', 'bug', 'chore', 'research', 'article'));

-- Create index for analytics queries filtering by task_type
CREATE INDEX IF NOT EXISTS idx_bender_performance_task_type
  ON bender_performance(bender_slug, task_type);

-- ============================================================================
-- BACKFILL: Populate task_type from nexus_cards where card_id matches task_id
-- task_id in bender_performance stores the NEXUS card_id (e.g. 'NEXUS-042').
-- ============================================================================
UPDATE bender_performance bp
SET task_type = nc.card_type
FROM nexus_cards nc
WHERE nc.card_id = bp.task_id
  AND bp.task_type IS NULL;

-- ============================================================================
-- VIEW: bender_performance_by_type
-- EWMA averages per bender per task_type.
-- Enables routing decisions: assign research to benders with high research EWMA.
-- ============================================================================
CREATE OR REPLACE VIEW bender_performance_by_type AS
SELECT
  bender_slug,
  bender_name,
  task_type,
  COUNT(*) AS task_count,
  ROUND(AVG(score), 1) AS avg_score,
  -- Most recent EWMA snapshot for this bender+type combination
  (
    ARRAY_AGG(ewma_snapshot ORDER BY reviewed_at DESC)
  )[1] AS latest_ewma,
  MIN(score) AS min_score,
  MAX(score) AS max_score,
  ROUND(STDDEV(score)::NUMERIC, 1) AS score_stddev,
  MAX(reviewed_at) AS last_scored_at
FROM bender_performance
WHERE task_type IS NOT NULL
GROUP BY bender_slug, bender_name, task_type
ORDER BY bender_slug, task_type;

-- ============================================================================
-- VIEW: bender_type_routing_signal
-- Aggregated signal for dea to use when selecting benders for task types.
-- Shows which benders are strong (avg >= 85), adequate (>= 75), or weak (< 75)
-- per task type, with minimum task count threshold for reliability.
-- ============================================================================
CREATE OR REPLACE VIEW bender_type_routing_signal AS
SELECT
  task_type,
  bender_slug,
  bender_name,
  task_count,
  avg_score,
  latest_ewma,
  CASE
    WHEN task_count < 3 THEN 'insufficient_data'
    WHEN avg_score >= 85 THEN 'strong'
    WHEN avg_score >= 75 THEN 'adequate'
    ELSE 'weak'
  END AS routing_signal,
  last_scored_at
FROM bender_performance_by_type
ORDER BY task_type, avg_score DESC NULLS LAST;

-- ============================================================================
-- Usage examples:
--
-- Which benders are strong at research tasks?
--   SELECT bender_slug, avg_score, task_count
--   FROM bender_type_routing_signal
--   WHERE task_type = 'research' AND routing_signal = 'strong';
--
-- Full breakdown for a specific bender:
--   SELECT task_type, avg_score, task_count, routing_signal
--   FROM bender_type_routing_signal
--   WHERE bender_slug = 'atlas'
--   ORDER BY avg_score DESC;
--
-- All performance data with type:
--   SELECT * FROM bender_performance_by_type;
-- ============================================================================
