# Supabase Migrations

## Overview

Database migrations for the control-center Supabase backend.

| Environment | Project | Project ID |
|------------|---------|------------|
| **Production** (kerrigan) | `cpfhgisfkudoiajcoujx.supabase.co` | `cpfhgisfkudoiajcoujx` |
| ~~**Development** (dev-kerrigan)~~ | ~~`hehldpjqlxhshdqqadng.supabase.co`~~ | **Repurposed 2026-02-24** — now `dea-exmachina-admin` (product platform DB). Dev staging offline during infrastructure separation transition. Migrations go direct-to-prod. See `workflows/public/migration-promote.md`. |

## Baseline

The schema was initially built through iterative migrations on prod, then exported as a consolidated baseline and applied to dev-kerrigan (2026-02-10). The original 17 migration files are tracked in Supabase's `schema_migrations` table on prod but are not stored in this directory — the baseline supersedes them.

## Naming Convention

```
YYYYMMDDHHMMSS_description_in_snake_case.sql
```

Example: `20260210180000_add_status_column_to_nexus_cards.sql`

## Migration Workflow (Transition Mode)

> **2026-02-24**: Dev instance offline — `dev-kerrigan` repurposed as product admin DB. During transition, all migrations go **direct-to-production** with extra review diligence.

```
1. Create migration file:
   supabase/migrations/YYYYMMDDHHMMSS_description.sql

2. Review carefully (no dev safety net):
   - Check idempotency (IF NOT EXISTS, IF EXISTS guards)
   - Verify no destructive changes without rollback path
   - Confirm RLS policies are correct before applying

3. Apply to prod:
   MCP apply_migration → project_id: cpfhgisfkudoiajcoujx

4. Commit migration file in card branch
```

**Process discipline, not CI/CD enforcement.** dea is the only entity running migrations.

## Applying Migrations

Via Supabase MCP Server (installed project-scoped in dea-exmachina):

```
# Prod (always explicit project_id during transition)
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
