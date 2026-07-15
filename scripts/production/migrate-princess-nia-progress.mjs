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

function isTestProfileName(name) {
  const n = String(name || '').trim().toLowerCase();
  return n === 'guest' || n === 'nsi' || n === 'mar' || n.startsWith('nsi ') || n.startsWith('mar ');
}

async function childProfiles(client) {
  const params = [];
  const where = [];
  if (parentEmail) { params.push(parentEmail); where.push(`LOWER(gp.email) = $${params.length}`); }
  const result = await client.query(`
    SELECT c.id, c.parent_id, c.first_name, gp.email
    FROM gates_child_profiles c
    JOIN gates_parent_profiles gp ON gp.id = c.parent_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY c.parent_id, c.id` , params);
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

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const profiles = await childProfiles(client);
    const canonical = profiles.find((p) => p.child_name.toLowerCase() === canonicalName);
    if (!canonical) throw new Error(`Canonical child profile not found: ${canonicalName}`);
    const suspects = profiles.filter((p) => p.parent_id === canonical.parent_id && isTestProfileName(p.child_name));
    console.log(JSON.stringify({ canonical: { id: canonical.id, name: canonical.child_name, parent_email: canonical.email }, suspects: suspects.map((p) => ({ id: p.id, name: p.child_name })) }, null, 2));

    const ids = suspects.map((p) => p.id);
    if (ids.length) {
      if (await tableExists(client, 'adaptive_v2_checkpoint_attempts')) {
        const r = dryRun ? await client.query('SELECT COUNT(*) FROM adaptive_v2_checkpoint_attempts WHERE child_id = ANY($1::bigint[])', [ids]) : await client.query('UPDATE adaptive_v2_checkpoint_attempts SET child_id=$1 WHERE child_id = ANY($2::bigint[]) RETURNING id', [canonical.id, ids]);
        console.log(`adaptive_v2_checkpoint_attempts ${dryRun ? 'would_migrate' : 'migrated'}=${dryRun ? r.rows[0].count : r.rowCount}`);
      }
      if (await tableExists(client, 'adaptive_v2_skill_progress')) {
        const rows = await client.query('SELECT * FROM adaptive_v2_skill_progress WHERE child_id = ANY($1::bigint[])', [ids]);
        console.log(`adaptive_v2_skill_progress found=${rows.rowCount}`);
        if (!dryRun) await client.query('UPDATE adaptive_v2_skill_progress SET child_id=$1, updated_at=NOW() WHERE child_id = ANY($2::bigint[])', [canonical.id, ids]);
      }
      if (await tableExists(client, 'skill_world_progress')) {
        const rows = await client.query('SELECT * FROM skill_world_progress WHERE child_id = ANY($1::bigint[])', [ids]);
        console.log(`skill_world_progress found=${rows.rowCount}`);
        if (!dryRun) await client.query('UPDATE skill_world_progress SET child_id=$1, updated_at=NOW() WHERE child_id = ANY($2::bigint[])', [canonical.id, ids]);
      }
      if (await tableExists(client, 'assessment_sessions')) {
        const r = dryRun ? await client.query('SELECT COUNT(*) FROM assessment_sessions WHERE learner_id = ANY($1::bigint[])', [ids]) : await client.query('UPDATE assessment_sessions SET learner_id=$1, parent_profile_id=$2, updated_at=NOW() WHERE learner_id = ANY($3::bigint[]) RETURNING id', [canonical.id, canonical.parent_id, ids]);
        console.log(`assessment_sessions ${dryRun ? 'would_migrate' : 'migrated'}=${dryRun ? r.rows[0].count : r.rowCount}`);
      }
    }
    if (dryRun) await client.query('ROLLBACK'); else await client.query('COMMIT');
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); await pool.end(); }
}

main().catch((err) => { console.error(err); process.exit(1); });
