# baseline/

Product baseline migrations — the complete starting schema for any new user database.

## Files

| File | Status | Purpose |
|------|--------|---------|
| `000_product_baseline.sql` | PENDING (Phase 3) | Full product schema for fresh user DB provisioning |
| `001_seed_models.sql` | PENDING (Phase 3) | model_library seed data |
| `002_seed_templates.sql` | PENDING (Phase 3) | project_templates seed data |
| `003_seed_agents.sql` | PENDING (Phase 3) | Starter bender_identities seed (5 default agents) |
| `004_seed_lane_transitions.sql` | PENDING (Phase 3) | nexus_lane_transitions seed data |

## Generation

Baseline is generated via:
```bash
dea schema generate-baseline
```

Or manually: extract DDL for all `product` + `platform-seed` classified tables from admin DB,
add user_id columns + RLS, include `_schema_meta` and `_migration_log` provisioning.

**Pre-condition for Phase 3**: Phase 2 (add user_id to admin DB) must be complete.

See `workflows/schema-propagation.md` § "Baseline Regeneration" for full procedure.
