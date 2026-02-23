-- Migration: bender_delivery_mode
-- Adds explicit delivery mode to bender tasks to eliminate file write ambiguity.
-- Benders previously had to infer delivery method from context; this makes it declarative.

-- Add delivery_mode to bender_tasks (operational: mode selected at assignment time)
ALTER TABLE bender_tasks
  ADD COLUMN IF NOT EXISTS delivery_mode TEXT NOT NULL DEFAULT 'git'
    CHECK (delivery_mode IN ('git', 'file', 'inline'));

-- Add output_path to nexus_task_details (metadata: absolute path for file-mode deliverables)
ALTER TABLE nexus_task_details
  ADD COLUMN IF NOT EXISTS output_path TEXT;

COMMENT ON COLUMN bender_tasks.delivery_mode IS 'How bender delivers work: git=commit branch, file=write to output_path, inline=return in task output';
COMMENT ON COLUMN nexus_task_details.output_path IS 'Absolute path for file-mode deliverables (e.g. D:/ProtonDrive/.../inbox/bender-box/deliverables/filename.md)';
