-- CC-111: Backfill completed_at for done cards that predate the trigger
-- Uses updated_at as the best available proxy for when the card was completed.
-- Only touches cards in 'done' lane with NULL completed_at.
UPDATE nexus_cards
SET completed_at = updated_at
WHERE lane = 'done'
  AND completed_at IS NULL;
