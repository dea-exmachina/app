-- Auto-flag cards for production when moved to review lane
-- Governed by routing_config setting (user can toggle in settings page)

-- Insert auto_flag_on_review setting into routing_config (default: enabled)
INSERT INTO routing_config (key, value, description, updated_at)
VALUES (
  'auto_flag_on_review',
  '{"enabled": true}'::jsonb,
  'Auto-flag cards for release when moved to review lane',
  now()
)
ON CONFLICT (key) DO NOTHING;

-- Create trigger function: auto-flag cards for production when moved to review
CREATE OR REPLACE FUNCTION auto_flag_for_production()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when lane changes TO review
  IF NEW.lane = 'review' AND (OLD.lane IS NULL OR OLD.lane != 'review') THEN
    -- Check if auto-flag setting is enabled
    IF EXISTS (
      SELECT 1 FROM routing_config
      WHERE key = 'auto_flag_on_review'
      AND (value->>'enabled')::boolean = true
    ) THEN
      NEW.ready_for_production := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on nexus_cards
DROP TRIGGER IF EXISTS trg_auto_flag_for_production ON nexus_cards;
CREATE TRIGGER trg_auto_flag_for_production
  BEFORE UPDATE ON nexus_cards
  FOR EACH ROW
  EXECUTE FUNCTION auto_flag_for_production();
