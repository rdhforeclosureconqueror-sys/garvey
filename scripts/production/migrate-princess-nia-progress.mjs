import process from 'node:process';
import { Pool } from 'pg';

const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) {
  console.error('DATABASE_URL is required for production verification.');
  process.exit(1);
}

const parentEmail = String(process.env.PARENT_EMAIL || process.env.GATES_PARENT_EMAIL || '').trim().toLowerCase();
const canonicalName = String(process.env.CANONICAL_CHILD_NAME || 'Princess Nia').trim().toLowerCase();
const dryRun = process.env.DRY_RUN !== '0';
const pool = new Pool({ connectionString: databaseUrl, ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false } });

function emit(event, payload = {}) {
  console.log(JSON.stringify({ event, dry_run: dryRun, ...payload }, null, 2));
}

function isTestProfileName(name) {
  const n = String(name || '').trim().toLowerCase();
  return n === 'guest' || n === 'nsi' || n === 'mar' || n.startsWith('guest ') || n.startsWith('nsi ') || n.startsWith('mar ');
}

async function childProfiles(client) {
  const params = [];
  const where = [];
  if (parentEmail) { params.push(parentEmail); where.push(`LOWER(gp.email) = $${params.length}`); }
  const result = await client.query(`
    SELECT c.id::text AS id, c.parent_id::text AS parent_id, c.first_name, gp.email AS parent_email
    FROM gates_child_profiles c
    JOIN gates_parent_profiles gp ON gp.id = c.parent_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY c.parent_id, c.id`, params);
  return result.rows.map((row) => {
    let parsed = null;
    try { parsed = String(row.first_name || '').trim().startsWith('{') ? JSON.parse(row.first_name) : null; } catch {}
    return { ...row, child_name: String(parsed?.child_name || row.first_name || '').trim() };
  });
}

async function tableExists(client, table) {
  const r = await client.query(`SELECT to_regclass($1) AS name`, [table]);
  return Boolean(r.rows[0]?.name);
}

async function proposedRows(client, table, idColumn, ids, columns = '*') {
  if (!(await tableExists(client, table))) return [];
  const r = await client.query(`SELECT ${columns} FROM ${table} WHERE ${idColumn} = ANY($1::text[]) ORDER BY ${idColumn}, created_at NULLS LAST`, [ids]);
  return r.rows;
}

function assertSafe({ canonicalMatches, suspects }) {
  if (canonicalMatches.length !== 1) throw new Error(`Refusing migration: expected exactly one ${canonicalName} profile, found ${canonicalMatches.length}.`);
  const canonical = canonicalMatches[0];
  const wrongParent = suspects.filter((p) => p.parent_id !== canonical.parent_id);
  if (wrongParent.length) throw new Error(`Refusing migration: test/fake profiles are attached to a different parent than canonical child: ${wrongParent.map((p) => `${p.child_name}:${p.id}`).join(', ')}`);
  const missingParent = [canonical, ...suspects].filter((p) => !p.parent_id || !p.parent_email);
  if (missingParent.length) throw new Error(`Refusing migration: ownership cannot be proven for profile IDs ${missingParent.map((p) => p.id).join(', ')}.`);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const profiles = await childProfiles(client);
    const canonicalMatches = profiles.filter((p) => p.child_name.toLowerCase() === canonicalName);
    const canonical = canonicalMatches[0];
    const suspects = canonical ? profiles.filter((p) => p.parent_id === canonical.parent_id && isTestProfileName(p.child_name)) : [];
    assertSafe({ canonicalMatches, suspects });

    const ids = suspects.map((p) => p.id);
    emit('princess_nia_progress_migration_plan', {
      transaction: dryRun ? 'BEGIN plus ROLLBACK because DRY_RUN is enabled' : 'BEGIN plus COMMIT only after all updates succeed',
      canonical_child_profile: canonical,
      nsi_profile: suspects.find((p) => p.child_name.toLowerCase().startsWith('nsi')) || null,
      mar_profile: suspects.find((p) => p.child_name.toLowerCase().startsWith('mar')) || null,
      guest_orphaned_profiles: suspects.filter((p) => p.child_name.toLowerCase().startsWith('guest')),
      all_profiles_reviewed: profiles,
      proposed_source_profile_ids: ids
    });

    if (ids.length) {
      const checkpointRows = await proposedRows(client, 'adaptive_v2_checkpoint_attempts', 'child_id', ids, 'id, child_id, parent_profile_id::text, auth_user_id, grade, runtime_version, skill_id, checkpoint_id, is_correct, mastery_band_after, next_recommended_skill_id, created_at');
      emit('progress_records_proposed_for_migration', { table: 'adaptive_v2_checkpoint_attempts', target_child_id: canonical.id, records: checkpointRows });
      const skillRows = await proposedRows(client, 'adaptive_v2_skill_progress', 'child_id', ids, 'child_id, parent_profile_id::text, auth_user_id, learner_display_name, grade, runtime_version, selected_skill_id, checkpoint_attempts, correct_count, total_count, hint_usage_count, mastery_band, next_recommended_skill_id, created_at, updated_at');
      emit('progress_records_proposed_for_migration', { table: 'adaptive_v2_skill_progress', target_child_id: canonical.id, records: skillRows });
      const worldRows = await proposedRows(client, 'skill_world_progress', 'child_id', ids, 'child_id, parent_profile_id::text, auth_user_id, learner_display_name, skill_id, mode, status, progress_percent, attempts, correct, score_percent, hints_used, last_step, created_at, updated_at');
      emit('progress_records_proposed_for_migration', { table: 'skill_world_progress', target_child_id: canonical.id, records: worldRows });
      const assessmentRows = await proposedRows(client, 'assessment_sessions', 'learner_id', ids, 'session_id, learner_id, parent_profile_id::text, assessment_role, grade, subject, status, current_question_position, created_at, updated_at, completed_at');
      emit('progress_records_proposed_for_migration', { table: 'assessment_sessions', target_child_id: canonical.id, records: assessmentRows });

      if (!dryRun) {
        if (await tableExists(client, 'adaptive_v2_checkpoint_attempts')) await client.query('UPDATE adaptive_v2_checkpoint_attempts SET child_id=$1, parent_profile_id=$2 WHERE child_id = ANY($3::text[])', [canonical.id, canonical.parent_id, ids]);
        if (await tableExists(client, 'adaptive_v2_skill_progress')) await client.query('UPDATE adaptive_v2_skill_progress SET child_id=$1, parent_profile_id=$2, learner_display_name=$3, updated_at=NOW() WHERE child_id = ANY($4::text[])', [canonical.id, canonical.parent_id, canonical.child_name, ids]);
        if (await tableExists(client, 'skill_world_progress')) await client.query('UPDATE skill_world_progress SET child_id=$1, parent_profile_id=$2, learner_display_name=$3, updated_at=NOW() WHERE child_id = ANY($4::text[])', [canonical.id, canonical.parent_id, canonical.child_name, ids]);
        if (await tableExists(client, 'assessment_sessions')) await client.query('UPDATE assessment_sessions SET learner_id=$1, parent_profile_id=$2, updated_at=NOW() WHERE learner_id = ANY($3::text[])', [canonical.id, canonical.parent_id, ids]);
      }
    }
    if (dryRun) { await client.query('ROLLBACK'); emit('princess_nia_progress_migration_rolled_back_dry_run'); }
    else { await client.query('COMMIT'); emit('princess_nia_progress_migration_committed'); }
  } catch (err) { await client.query('ROLLBACK'); emit('princess_nia_progress_migration_failed_rolled_back', { error: String(err?.message || err) }); throw err; }
  finally { client.release(); await pool.end(); }
}

main().catch((err) => { console.error(err); process.exit(1); });
