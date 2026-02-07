-- Patch kanban_boards: add handoff column, slug unique constraint, nullable project_id
ALTER TABLE kanban_boards
  ADD COLUMN IF NOT EXISTS handoff jsonb DEFAULT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kanban_boards_slug_key'
  ) THEN
    ALTER TABLE kanban_boards ADD CONSTRAINT kanban_boards_slug_key UNIQUE (slug);
  END IF;
END $$;

ALTER TABLE kanban_boards ALTER COLUMN project_id DROP NOT NULL;
