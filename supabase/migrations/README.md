# Supabase Migrations

## Overview

Database migrations for the control-center Supabase backend. Two environments:

| Environment | Project | Project ID |
|------------|---------|------------|
| **Production** (kerrigan) | `cpfhgisfkudoiajcoujx.supabase.co` | `cpfhgisfkudoiajcoujx` |
| **Development** (dev-kerrigan) | `hehldpjqlxhshdqqadng.supabase.co` | `hehldpjqlxhshdqqadng` |

## Baseline

The schema was initially built through iterative migrations on prod, then exported as a consolidated baseline and applied to dev-kerrigan (2026-02-10). The original 17 migration files are tracked in Supabase's `schema_migrations` table on prod but are not stored in this directory — the baseline supersedes them.

## Naming Convention

```
YYYYMMDDHHMMSS_description_in_snake_case.sql
```

Example: `20260210180000_add_status_column_to_nexus_cards.sql`

## Dev-First Migration Workflow

All new migrations follow **dev-first, prod-second**:

```
1. Create migration file:
   supabase/migrations/YYYYMMDDHHMMSS_description.sql

2. Apply to dev:
   MCP apply_migration → project_id: hehldpjqlxhshdqqadng

3. Test:
   - Local: npm run dev (auto-uses dev via .env.development.local)
   - Vercel: push to dev branch → preview deployment uses dev-kerrigan

4. Apply to prod:
   MCP apply_migration → project_id: cpfhgisfkudoiajcoujx

5. Commit migration file in card branch
```

**Process discipline, not CI/CD enforcement.** dea is the only entity running migrations.

## Applying Migrations

Via Supabase MCP Server (installed project-scoped in dea-exmachina):

```
# Dev
mcp apply_migration(name: "description", query: "<SQL>")
→ targets dev-kerrigan (default project from .mcp.json)

# Prod (explicit project_id)
mcp apply_migration(project_id: "cpfhgisfkudoiajcoujx", name: "description", query: "<SQL>")
```

Or via the Supabase MCP tools with explicit project_id parameter.

## What Lives Here

- **Migration SQL files** — DDL changes (CREATE TABLE, ALTER, indexes, RLS policies, functions)
- **This README** — workflow documentation

Migration files are committed to git and serve as the audit trail for schema evolution.

## Schema Parity

Periodically verify dev matches prod:

```sql
-- Compare table counts
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Compare column definitions
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

Run on both projects and diff the output.

---

_Established: 2026-02-10_
