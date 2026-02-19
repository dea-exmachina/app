-- NEXUS-098: Audit/comment separation — remove system lane-change stubs from nexus_comments
--
-- Problem: auto_comment_lane_change writes "Lane changed: X → Y" stubs into nexus_comments
-- on every transition. nexus_comments should be pure agent/human communication; system
-- audit facts belong in nexus_events only.
--
-- Fix: nexus_emit_card_event already captures card.moved events with from_lane/to_lane
-- in nexus_events.payload. Remove the duplicate INSERT from auto_comment_lane_change.
-- The trigger itself is kept (may gain other responsibilities later) but now is a no-op.

CREATE OR REPLACE FUNCTION auto_comment_lane_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Lane change audit facts are captured in nexus_events by nexus_emit_card_event.
  -- System comment stubs removed per NEXUS-098 (audit/comment separation principle).
  -- nexus_comments is reserved for agent/human communication only.
  RETURN NEW;
END;
$$;
