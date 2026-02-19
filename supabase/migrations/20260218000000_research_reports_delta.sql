-- CC-080: Add delta tracking columns to research_reports
-- Additive migration — no data loss, all columns nullable

ALTER TABLE research_reports
  ADD COLUMN IF NOT EXISTS previous_report_id uuid REFERENCES research_reports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delta_summary text,
  ADD COLUMN IF NOT EXISTS new_findings_count integer;

CREATE INDEX IF NOT EXISTS idx_research_reports_previous_report_id
  ON research_reports(previous_report_id);

CREATE INDEX IF NOT EXISTS idx_research_reports_subscription_date
  ON research_reports(subscription_id, report_date DESC);

-- Rollback SQL (for reference):
-- ALTER TABLE research_reports
--   DROP COLUMN IF EXISTS previous_report_id,
--   DROP COLUMN IF EXISTS delta_summary,
--   DROP COLUMN IF EXISTS new_findings_count;
-- DROP INDEX IF EXISTS idx_research_reports_previous_report_id;
-- DROP INDEX IF EXISTS idx_research_reports_subscription_date;
