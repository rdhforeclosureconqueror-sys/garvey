# Tap CRM Phase 2 Runtime Database Verification

Date: 2026-04-10

## Objective

Run **real** Tap CRM migration verification against an actual PostgreSQL instance (not mocked pool behavior).

## Environment

- PostgreSQL 16 installed and started in the runtime container.
- Verification database: `tapcrm_phase2_verify` (created and dropped by script).
- Command executed:

```bash
node scripts/tap-crm-phase2-runtime-verify.mjs
```

## Evidence

```json
{
  "database": "tapcrm_phase2_verify",
  "step1_up_execution": {
    "migrationResult": {
      "appliedCount": 1,
      "totalMigrations": 1
    },
    "tablesAfterUp": [
      "tap_crm_contact_tags",
      "tap_crm_contacts",
      "tap_crm_pipeline_items",
      "tap_crm_schema_migrations",
      "tap_crm_tags"
    ],
    "indexesAfterUp": [
      "tap_crm_contact_tags_tenant_contact_idx",
      "tap_crm_contacts_tenant_stage_idx",
      "tap_crm_pipeline_items_tenant_stage_idx",
      "tap_crm_tags_tenant_key_idx"
    ],
    "migrationRowsAfterUp": [
      "tap_crm_001_init"
    ]
  },
  "step2_schema_verify_after_up": {
    "ok": true,
    "missingTables": [],
    "missingIndexes": []
  },
  "step3_down_execution": {
    "tablesAfterDown": [],
    "indexesAfterDown": [],
    "migrationTablePresentAfterDown": false
  },
  "step4_reup_after_down": {
    "migrationResult": {
      "appliedCount": 1,
      "totalMigrations": 1
    },
    "tablesAfterReUp": [
      "tap_crm_contact_tags",
      "tap_crm_contacts",
      "tap_crm_pipeline_items",
      "tap_crm_schema_migrations",
      "tap_crm_tags"
    ],
    "indexesAfterReUp": [
      "tap_crm_contact_tags_tenant_contact_idx",
      "tap_crm_contacts_tenant_stage_idx",
      "tap_crm_pipeline_items_tenant_stage_idx",
      "tap_crm_tags_tenant_key_idx"
    ],
    "migrationRowsAfterReUp": [
      "tap_crm_001_init"
    ],
    "verifyAfterReUp": {
      "ok": true,
      "missingTables": [],
      "missingIndexes": []
    }
  }
}
```

## Conclusions

1. **UP execution succeeded** with all required tables/indexes present and migration row persisted.
2. **`verifyTapCrmSchema` passed** on real DB state after UP.
3. **DOWN rollback succeeded** with all Tap CRM tables/indexes removed and migration record/table removed.
4. **UP re-run succeeded** cleanly after rollback.

## Notes

- This is strictly Phase 2 schema verification; no Phase 3 behavior was introduced.
