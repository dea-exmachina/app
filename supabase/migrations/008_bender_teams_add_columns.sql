-- Add missing columns to bender_teams for v1→v2 migration
-- Migration: 008_bender_teams_add_columns.sql

-- Add members JSONB column for team member definitions
ALTER TABLE bender_teams
ADD COLUMN IF NOT EXISTS members JSONB NOT NULL DEFAULT '[]';

-- Add file_ownership JSONB column for ownership boundaries
ALTER TABLE bender_teams
ADD COLUMN IF NOT EXISTS file_ownership JSONB NOT NULL DEFAULT '{}';

-- Add updated_at for consistency
ALTER TABLE bender_teams
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
