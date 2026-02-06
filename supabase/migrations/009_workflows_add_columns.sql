-- Add missing columns to workflows for v1→v2 migration
-- Migration: 009_workflows_add_columns.sql

-- Add name column (use slug as default, can be updated later)
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS name TEXT;

-- Populate name from slug for existing rows
UPDATE workflows SET name = slug WHERE name IS NULL;

-- Add skill column for linked skill reference
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS skill TEXT;

-- Add created column for creation date display
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS created TEXT;

-- Add file_path column (use markdown_path as source)
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Populate file_path from markdown_path for existing rows
UPDATE workflows SET file_path = markdown_path WHERE file_path IS NULL;
