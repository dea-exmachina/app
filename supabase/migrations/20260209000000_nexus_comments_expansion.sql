-- NEXUS Comments Expansion — bender authors + lifecycle comment types
-- Expands comment_type CHECK to include delivery/review/rejection.
-- Adds unresolved index for badge queries.
-- Updates event trigger to include content_preview for Discord formatting.
--
-- Note: author has no DB constraint (validated in API only), so no schema change needed for bender authors.

-- 1. Drop + recreate comment_type CHECK (add delivery, review, rejection)
ALTER TABLE nexus_comments DROP CONSTRAINT IF EXISTS nexus_comments_comment_type_check;
ALTER TABLE nexus_comments ADD CONSTRAINT nexus_comments_comment_type_check
  CHECK (comment_type IN ('note', 'pivot', 'question', 'directive', 'delivery', 'review', 'rejection'));

-- 2. Partial index for unresolved comments per card (supports badge/notification queries)
CREATE INDEX IF NOT EXISTS idx_nexus_comments_unresolved
  ON nexus_comments(card_id)
  WHERE resolved = false;

-- 3. Update comment event trigger to include content_preview for Discord
CREATE OR REPLACE FUNCTION nexus_emit_comment_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO nexus_events (event_type, card_id, actor, payload)
  VALUES (
    CASE WHEN NEW.is_pivot THEN 'comment.pivot' ELSE 'comment.added' END,
    NEW.card_id, NEW.author,
    jsonb_build_object(
      'comment_id', NEW.id,
      'type', NEW.comment_type,
      'is_pivot', NEW.is_pivot,
      'content_preview', LEFT(NEW.content, 200)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
