# product-migrations/

Generated product migrations — tagged `[product]` migrations transformed for user DBs.

These files are derived from admin DB migrations in `../migrations/`. They include:
- `user_id` columns added where `_table_classification.multi_tenant_key = 'user_id'`
- RLS policies for all product tables
- Admin-only FKs and triggers stripped
- Admin-specific defaults replaced with user-appropriate values

## Naming Convention

```
{version}_{original_migration_name}_user.sql
```

Example: `20260225000001_add_learning_signals_user.sql`

## Status

Phase 1 — directory scaffolded. Files generated manually until `dea schema propagate` CLI is built.

See `workflows/schema-propagation.md` for the full pipeline SOP.
