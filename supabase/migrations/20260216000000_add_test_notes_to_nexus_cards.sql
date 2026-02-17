-- Add test_notes column for verification notes on card detail (CC-064)
ALTER TABLE nexus_cards ADD COLUMN IF NOT EXISTS test_notes text;
COMMENT ON COLUMN nexus_cards.test_notes IS 'Verification/testing notes for the card — displayed on card detail panel';
