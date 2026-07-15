# Princess Nia production deployment and verification runbook

This runbook is for production operators who need to migrate guest/test progress from NSI, Mar, or guest/orphaned profiles onto Princess Nia's canonical child profile using the hosting environment's `DATABASE_URL`.

## Copy-paste production runbook

```bash
###############################################################################
# Princess Nia production migration + verification runbook
#
# Already tested before production:
# - The migration script is present at scripts/production/migrate-princess-nia-progress.mjs.
# - The script opens a database transaction with BEGIN and uses ROLLBACK for dry-run.
# - If any migration step throws, the catch block issues ROLLBACK before exiting non-zero.
# - The script does not delete test/fake profiles. It only reports profiles and migrates
#   progress references when DRY_RUN=0 is explicitly supplied.
# - Server-side progress writes reject unauthenticated/unowned child IDs and emit structured
#   logs with submitted_child_id and rejection_reason; no DATABASE_URL, passwords, tokens,
#   cookies, or private credentials are logged.
#
# Still must be performed in production:
# - Run this runbook from the hosting environment or one-off production shell where the
#   production DATABASE_URL is already injected by the host.
# - Review dry-run output and counts before running DRY_RUN=0.
# - Run the real migration only after confirming ownership and proposed records.
# - Complete the browser verification as the real parent account.
###############################################################################

set -euo pipefail

# 0) Open a production shell in the hosting environment.
#    Examples:
#      Render:   use the service Shell, or a one-off job with the same environment.
#      Railway:  railway shell, or railway run bash.
#      Heroku:   heroku run bash --app <app-name>.
#      Fly.io:   fly ssh console --app <app-name>.
#    Do not paste DATABASE_URL into chat, tickets, screenshots, or logs.
#    This runbook assumes DATABASE_URL is already present in the environment.

node -e 'if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is missing in this shell"); process.exit(1); } console.log("DATABASE_URL is present (value intentionally not printed)");'

# 1) Configure the parent account and canonical child name for this run.
#    Replace the parent email with the real production parent account email.
export PARENT_EMAIL='REPLACE_WITH_PARENT_EMAIL@example.com'
export CANONICAL_CHILD_NAME='Princess Nia'

# 2) Capture BEFORE counts for canonical, NSI, Mar, and guest/orphaned profiles.
#    Save this output. It is the baseline used for after-migration verification and rollback.
node <<'NODE'
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });
const parentEmail = String(process.env.PARENT_EMAIL || '').trim().toLowerCase();
function profileName(firstName) { try { const parsed = String(firstName || '').trim().startsWith('{') ? JSON.parse(firstName) : null; return String(parsed?.child_name || firstName || '').trim(); } catch { return String(firstName || '').trim(); } }
(async () => {
  const client = await pool.connect();
  try {
    const profiles = await client.query(`SELECT c.id::text, c.parent_id::text, gp.email AS parent_email, c.first_name FROM gates_child_profiles c JOIN gates_parent_profiles gp ON gp.id=c.parent_id WHERE LOWER(gp.email)=$1 ORDER BY c.id`, [parentEmail]);
    const named = profiles.rows.map(r => ({ ...r, child_name: profileName(r.first_name) }));
    const relevant = named.filter(p => ['princess nia','nsi','mar','guest'].some(n => p.child_name.toLowerCase().startsWith(n)));
    const ids = relevant.map(p => p.id);
    console.log(JSON.stringify({ marker: 'BEFORE_PROFILE_OWNERSHIP', relevant_profiles: relevant }, null, 2));
    for (const [table, col] of [['adaptive_v2_checkpoint_attempts','child_id'], ['adaptive_v2_skill_progress','child_id'], ['skill_world_progress','child_id'], ['assessment_sessions','learner_id']]) {
      const exists = await client.query('SELECT to_regclass($1) AS name', [table]);
      if (!exists.rows[0].name) { console.log(JSON.stringify({ marker: 'BEFORE_COUNTS', table, exists: false }, null, 2)); continue; }
      const counts = await client.query(`SELECT ${col}::text AS profile_id, COUNT(*)::int AS records FROM ${table} WHERE ${col}=ANY($1::text[]) GROUP BY ${col} ORDER BY ${col}`, [ids]);
      console.log(JSON.stringify({ marker: 'BEFORE_COUNTS', table, id_column: col, counts: counts.rows }, null, 2));
    }
  } finally { client.release(); await pool.end(); }
})().catch(err => { console.error(err); process.exit(1); });
NODE

# 3) Run the migration in dry-run mode first. This must use production DATABASE_URL
#    from the hosting environment and must not commit any data changes.
DRY_RUN=1 npm run production:migrate-princess-nia-progress | tee princess-nia-dry-run.jsonl

# 4) Review the dry-run output before continuing.
#    The JSON event princess_nia_progress_migration_plan identifies:
#      - canonical_child_profile.id: Princess Nia's canonical child profile ID
#      - nsi_profile.id: NSI's profile ID, if present
#      - mar_profile.id: Mar's profile ID, if present
#      - guest_orphaned_profiles[].id: guest/orphaned progress source profiles
#      - parent_id and parent_email on every profile, proving the parent account
#    The JSON events progress_records_proposed_for_migration identify every progress
#    record proposed for migration, grouped by table:
#      - adaptive_v2_checkpoint_attempts
#      - adaptive_v2_skill_progress
#      - skill_world_progress
#      - assessment_sessions
#    Safety stop rule: DO NOT run the real migration unless all of these are true:
#      - exactly one canonical_child_profile is Princess Nia
#      - NSI, Mar, and guest/orphaned source profiles all have the same parent_id and
#        parent_email as Princess Nia
#      - every proposed record belongs to one of those reviewed source profile IDs
#      - ownership is proven by the parent account in the dry-run output
#    The script also refuses to proceed and rolls back if:
#      - more than one Princess Nia profile matches
#      - a wrong/test profile belongs to a different parent
#      - profile ownership cannot be proven
#
#    Test/fake profile rule:
#      - Do not automatically delete NSI, Mar, guest, or other fake profiles.
#      - After migration, review their remaining records manually.
#      - Only disable or delete them through the normal admin/data-retention process
#        after confirming no legitimate records remain.

# 5) Run the real migration only after reviewing the dry-run output and BEFORE counts.
#    This starts a transaction, updates all supported progress tables, and commits only
#    after every step succeeds. If any step fails, the catch block rolls back all changes.
DRY_RUN=0 npm run production:migrate-princess-nia-progress | tee princess-nia-migration.jsonl

# 6) Capture AFTER counts and verify the records moved to Princess Nia's canonical ID.
node <<'NODE'
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });
const parentEmail = String(process.env.PARENT_EMAIL || '').trim().toLowerCase();
function profileName(firstName) { try { const parsed = String(firstName || '').trim().startsWith('{') ? JSON.parse(firstName) : null; return String(parsed?.child_name || firstName || '').trim(); } catch { return String(firstName || '').trim(); } }
(async () => {
  const client = await pool.connect();
  try {
    const profiles = await client.query(`SELECT c.id::text, c.parent_id::text, gp.email AS parent_email, c.first_name FROM gates_child_profiles c JOIN gates_parent_profiles gp ON gp.id=c.parent_id WHERE LOWER(gp.email)=$1 ORDER BY c.id`, [parentEmail]);
    const named = profiles.rows.map(r => ({ ...r, child_name: profileName(r.first_name) }));
    const relevant = named.filter(p => ['princess nia','nsi','mar','guest'].some(n => p.child_name.toLowerCase().startsWith(n)));
    const ids = relevant.map(p => p.id);
    console.log(JSON.stringify({ marker: 'AFTER_PROFILE_OWNERSHIP', relevant_profiles: relevant }, null, 2));
    for (const [table, col] of [['adaptive_v2_checkpoint_attempts','child_id'], ['adaptive_v2_skill_progress','child_id'], ['skill_world_progress','child_id'], ['assessment_sessions','learner_id']]) {
      const exists = await client.query('SELECT to_regclass($1) AS name', [table]);
      if (!exists.rows[0].name) { console.log(JSON.stringify({ marker: 'AFTER_COUNTS', table, exists: false }, null, 2)); continue; }
      const counts = await client.query(`SELECT ${col}::text AS profile_id, COUNT(*)::int AS records FROM ${table} WHERE ${col}=ANY($1::text[]) GROUP BY ${col} ORDER BY ${col}`, [ids]);
      console.log(JSON.stringify({ marker: 'AFTER_COUNTS', table, id_column: col, counts: counts.rows }, null, 2));
    }
  } finally { client.release(); await pool.end(); }
})().catch(err => { console.error(err); process.exit(1); });
NODE

# 7) Rollback procedure if results are incorrect.
#    Prefer restoring the database from the hosting provider's point-in-time backup or
#    snapshot taken before step 5. That is the safest rollback because it restores all
#    affected tables consistently.
#
#    If the host cannot do point-in-time restore and you must reverse only this migration,
#    use the saved dry-run output to identify exact source IDs and records. Then run a
#    manual transaction that moves only those reviewed records back to their original IDs.
#    Example template; replace IDs and WHERE clauses from princess-nia-dry-run.jsonl:
#
# psql "$DATABASE_URL" <<'SQL'
# BEGIN;
# -- Example only. Replace canonical/source IDs and narrow by reviewed record IDs.
# -- UPDATE adaptive_v2_checkpoint_attempts SET child_id = '<ORIGINAL_SOURCE_ID>' WHERE child_id = '<PRINCESS_NIA_CANONICAL_ID>' AND id IN (...reviewed ids...);
# -- UPDATE adaptive_v2_skill_progress SET child_id = '<ORIGINAL_SOURCE_ID>', updated_at = NOW() WHERE child_id = '<PRINCESS_NIA_CANONICAL_ID>' AND selected_skill_id IN (...reviewed skills...);
# -- UPDATE skill_world_progress SET child_id = '<ORIGINAL_SOURCE_ID>', updated_at = NOW() WHERE child_id = '<PRINCESS_NIA_CANONICAL_ID>' AND skill_id IN (...reviewed skills...) AND mode IN (...reviewed modes...);
# -- UPDATE assessment_sessions SET learner_id = '<ORIGINAL_SOURCE_ID>', updated_at = NOW() WHERE learner_id = '<PRINCESS_NIA_CANONICAL_ID>' AND session_id IN (...reviewed session ids...);
# -- Verify counts here before COMMIT.
# COMMIT;
# SQL

# 8) Exact production browser test procedure.
#    Use the production URL and real parent account. Do not use fake credentials in logs.
#    A. Open production in a browser.
#    B. Log in as the parent account configured by PARENT_EMAIL.
#    C. Select the child profile named Princess Nia.
#    D. Complete one assessment.
#    E. Verify the assessment database record uses Princess Nia's canonical ID:
#       psql "$DATABASE_URL" -c "SELECT session_id, learner_id, parent_profile_id, status, completed_at FROM assessment_sessions WHERE learner_id='<PRINCESS_NIA_CANONICAL_ID>' ORDER BY updated_at DESC LIMIT 5;"
#    F. Complete part of a Skill World for Princess Nia.
#    G. Refresh the browser and confirm the Skill World progress remains visible.
#    H. Log out.
#    I. Log back in as the same parent.
#    J. Select Princess Nia again and confirm progress remains visible.
#    K. Open the existing Youth Development Parent Dashboard, not the standalone
#       adaptive diagnostic page:
#       https://garveyfrontend.onrender.com/youth-development/parent-dashboard
#       Include tenant, email, and child_id query parameters if production routing
#       requires scoped account continuity.
#    L. Confirm Princess Nia is the selected/active child profile and NSI, Mar,
#       guest, or orphaned profiles are not displayed as the active learner.
#    M. Confirm the existing Parent Dashboard Adaptive Learning section shows:
#       - assessment completion
#       - partial Skill World progress
#       - completed/in-progress/not-started Skill World status
#       - scores
#       - attempts
#       - next recommended activity
#       - completed, in-progress, and remaining work accurately
#    N. Refresh the browser and confirm the same progress remains visible.
#    O. Log out and log back in as the same parent, select Princess Nia again,
#       and confirm the same dashboard progress remains visible.
#    P. Verify the Skill World database record uses Princess Nia's canonical ID:
#       psql "$DATABASE_URL" -c "SELECT child_id, parent_profile_id, skill_id, mode, status, progress_percent, attempts, correct, score_percent, updated_at FROM skill_world_progress WHERE child_id='<PRINCESS_NIA_CANONICAL_ID>' ORDER BY updated_at DESC LIMIT 10;"
#    Q. Verify adaptive checkpoint summary uses Princess Nia's canonical ID:
#       psql "$DATABASE_URL" -c "SELECT child_id, parent_profile_id, selected_skill_id, checkpoint_attempts, correct_count, total_count, mastery_band, next_recommended_skill_id, updated_at FROM adaptive_v2_skill_progress WHERE child_id='<PRINCESS_NIA_CANONICAL_ID>' ORDER BY updated_at DESC LIMIT 10;"
#    R. Watch server logs during this browser test. Rejected progress writes should appear
#       as JSON with event="adaptive_progress_write_rejected", submitted_child_id, route,
#       rejection_reason, and status. Credentials must not appear in these logs.
###############################################################################
```
