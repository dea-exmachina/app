-- Add optional reference_date to research_subscriptions
-- Allows subscriptions to specify a "search from" date for their data fetchers
-- NULL means use the frequency-based period (current default behaviour)
ALTER TABLE research_subscriptions
  ADD COLUMN IF NOT EXISTS reference_date date NULL;

COMMENT ON COLUMN research_subscriptions.reference_date IS
  'Optional: earliest date for search results. NULL = use frequency-based period_start.';
