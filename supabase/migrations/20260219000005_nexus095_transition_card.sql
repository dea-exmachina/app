-- NEXUS-095: transition_card() stored procedure + bender done pending-score trigger
--
-- PROBLEM: Lane changes in NEXUS have no enforced entry point. dea can move a card
-- to 'in_progress', 'review', or 'done' without any comment, making it impossible
-- to audit WHY the card moved. Additionally, when a BENDER card reaches 'done',
-- scoring is skipped unless dea manually creates a bender_performance row — leading
-- to ghost benders with 0 scored tasks despite real work delivered.
--
-- SOLUTION: (1) transition_card() proc: single entry point for all lane changes.
-- Requires a non-empty comment for gated lanes (in_progress, review, done).
-- Inserts comment into nexus_comments. Sets completed_at on done. Returns updated row.
-- (2) trg_bender_done_pending_score trigger: fires AFTER UPDATE when a BENDER card
-- moves to done. Auto-inserts a bender_performance pending row so scoring cannot be skipped.
--
-- PREREQUISITE: bender_performance.score must be nullable for pending rows.
-- Original schema defined score as INTEGER NOT NULL. This migration relaxes that
-- constraint and also relaxes 'level' to allow 'pending' as a valid value.

SET search_path = public;

-- ============================================================================
-- SCHEMA: Make bender_performance.score nullable + allow 'pending' level
-- Required for pending score rows inserted by the trigger.
-- ============================================================================

-- Drop the NOT NULL constraint on score (pending rows have NULL score)
ALTER TABLE bender_performance
  ALTER COLUMN score DROP NOT NULL;

-- Add 'pending' to the level CHECK constraint
-- The current constraint allows: exemplary, solid, needs_work, rework
-- We need to also allow: pending (not yet scored)
ALTER TABLE bender_performance
  DROP CONSTRAINT IF EXISTS bender_performance_level_check;

ALTER TABLE bender_performance
  ADD CONSTRAINT bender_performance_level_check
    CHECK (level IN ('exemplary', 'solid', 'needs_work', 'rework', 'pending'));

-- ============================================================================
-- FUNCTION: transition_card()
-- Single entry point for all nexus_cards lane transitions.
-- Enforces comment requirement for gated lanes: in_progress, review, done.
-- Sets completed_at when lane = 'done'.
-- Inserts into nexus_comments if comment is provided.
-- Returns the full updated nexus_cards row.
-- ============================================================================

CREATE OR REPLACE FUNCTION transition_card(
  p_card_uuid    UUID,
  p_to_lane      TEXT,
  p_comment      TEXT    DEFAULT NULL,
  p_author       TEXT    DEFAULT 'dea',
  p_comment_type TEXT    DEFAULT 'note'
)
RETURNS nexus_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gated_lanes TEXT[] := ARRAY['in_progress', 'review', 'done'];
  v_card        nexus_cards;
BEGIN
  -- ── 1. Validate card exists ──────────────────────────────────
  SELECT * INTO v_card
  FROM nexus_cards
  WHERE id = p_card_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card not found: %', p_card_uuid;
  END IF;

  -- ── 2. Enforce comment requirement on gated lanes ────────────
  -- in_progress, review, done require a non-empty comment explaining
  -- why the card is being moved. This creates an audit trail and
  -- prevents silent lane changes without context.
  IF p_to_lane = ANY(v_gated_lanes) AND (p_comment IS NULL OR trim(p_comment) = '') THEN
    RAISE EXCEPTION
      'Lane "%" requires a non-empty comment. Provide context for this transition (p_comment).',
      p_to_lane;
  END IF;

  -- ── 3. UPDATE nexus_cards lane ───────────────────────────────
  -- The existing validate_lane_transition trigger enforces sequential
  -- lane ordering (backlog → ready → in_progress → review → done).
  -- The nexus_emit_card_event trigger emits a card.moved nexus_event.
  -- We do not need to duplicate that logic here.
  IF p_to_lane = 'done' THEN
    UPDATE nexus_cards
    SET
      lane         = p_to_lane,
      completed_at = now()
    WHERE id = p_card_uuid
    RETURNING * INTO v_card;
  ELSE
    UPDATE nexus_cards
    SET lane = p_to_lane
    WHERE id = p_card_uuid
    RETURNING * INTO v_card;
  END IF;

  -- ── 4. INSERT nexus_comments if comment provided ─────────────
  -- Non-gated lanes (backlog, ready) allow optional comments.
  -- Gated lanes (in_progress, review, done) have comment guaranteed by step 2.
  IF p_comment IS NOT NULL AND trim(p_comment) != '' THEN
    INSERT INTO nexus_comments (
      card_id,
      author,
      comment_type,
      content
    ) VALUES (
      p_card_uuid,
      p_author,
      p_comment_type,
      trim(p_comment)
    );
  END IF;

  -- ── 5. Return updated card ───────────────────────────────────
  RETURN v_card;
END;
$$;

GRANT EXECUTE ON FUNCTION transition_card TO authenticated;
GRANT EXECUTE ON FUNCTION transition_card TO service_role;

COMMENT ON FUNCTION transition_card IS
  'Single entry point for nexus_cards lane transitions.
   Requires a non-empty comment for gated lanes (in_progress, review, done).
   Sets completed_at = now() when transitioning to done.
   Inserts into nexus_comments when comment is provided.
   Lane sequence validation is handled by the validate_lane_transition trigger.
   Returns the updated nexus_cards row.
   Created: NEXUS-095, 2026-02-19.';

-- ============================================================================
-- TRIGGER FUNCTION: bender_done_create_pending_score()
-- Fires AFTER UPDATE on nexus_cards when a BENDER card moves to done.
-- Auto-inserts a bender_performance pending row so scoring is never skipped.
-- ============================================================================

CREATE OR REPLACE FUNCTION bender_done_create_pending_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire for BENDER cards moving TO done FROM a non-done lane
  IF NEW.lane = 'done'
    AND OLD.lane != 'done'
    AND NEW.delegation_tag = 'BENDER'
    AND NEW.assigned_to IS NOT NULL
  THEN
    INSERT INTO bender_performance (
      bender_slug,
      bender_name,
      task_id,
      score,
      ewma_snapshot,
      level,
      reviewed_by
    ) VALUES (
      NEW.assigned_to,
      NEW.assigned_to,        -- will be updated by scorer with full name
      NEW.card_id,
      NULL,                   -- pending — to be filled by dea/Abathur
      NULL,                   -- pending
      'pending',
      'pending'
    )
    ON CONFLICT DO NOTHING;   -- idempotent: re-running trigger does not duplicate
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER: trg_bender_done_pending_score
-- ============================================================================

DROP TRIGGER IF EXISTS trg_bender_done_pending_score ON nexus_cards;

CREATE TRIGGER trg_bender_done_pending_score
  AFTER UPDATE ON nexus_cards
  FOR EACH ROW
  EXECUTE FUNCTION bender_done_create_pending_score();

COMMENT ON FUNCTION bender_done_create_pending_score IS
  'Trigger function: auto-creates a pending bender_performance row when a BENDER card
   moves to done. Ensures scoring is never silently skipped. Row has score=NULL,
   level=pending, reviewed_by=pending until dea/Abathur scores the task.
   Idempotent: ON CONFLICT DO NOTHING prevents duplicates.
   Created: NEXUS-095, 2026-02-19.';

-- ============================================================================
-- Usage examples:
--
-- 1. Move a card to in_progress (requires comment):
--
--   SELECT * FROM transition_card(
--     p_card_uuid => 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid,
--     p_to_lane   => 'in_progress',
--     p_comment   => 'Starting implementation — building transition_card() proc as specified in NEXUS-095.',
--     p_author    => 'dea'
--   );
--
-- 2. Move a card to review with a delivery note:
--
--   SELECT * FROM transition_card(
--     p_card_uuid    => 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid,
--     p_to_lane      => 'review',
--     p_comment      => 'Migration written + branch pushed. Preview at card/NEXUS-095.',
--     p_author       => 'bender+orion',
--     p_comment_type => 'delivery'
--   );
--
-- 3. Move to done (marks completed_at, requires comment):
--
--   SELECT * FROM transition_card(
--     p_card_uuid => 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid,
--     p_to_lane   => 'done',
--     p_comment   => 'Deployed to production. Migration applied to prod instance.',
--     p_author    => 'dea'
--   );
--
-- 4. Move to ready (no comment required, comment optional):
--
--   SELECT * FROM transition_card(
--     p_card_uuid => 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid,
--     p_to_lane   => 'ready'
--   );
--
-- 5. Attempting gated lane without comment raises exception:
--
--   SELECT * FROM transition_card(
--     p_card_uuid => 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid,
--     p_to_lane   => 'in_progress'
--   );
--   -- ERROR: Lane "in_progress" requires a non-empty comment.
--
-- 6. Query pending scores awaiting dea/Abathur review:
--
--   SELECT task_id, bender_slug, reviewed_at
--   FROM bender_performance
--   WHERE level = 'pending'
--   ORDER BY reviewed_at DESC;
--
-- ============================================================================
