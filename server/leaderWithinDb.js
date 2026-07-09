"use strict";

async function applyLeaderWithinMigrations(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leader_within_programs (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      duration_weeks INTEGER NOT NULL,
      version TEXT NOT NULL DEFAULT '2026.07',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS leader_within_cohorts (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      location_id TEXT,
      name TEXT NOT NULL,
      program_id INTEGER REFERENCES leader_within_programs(id),
      current_week INTEGER NOT NULL DEFAULT 1,
      current_session TEXT NOT NULL DEFAULT 'A',
      assigned_facilitator_email TEXT,
      assigned_facilitator_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      alternate_story_title TEXT,
      is_demo BOOLEAN NOT NULL DEFAULT FALSE,
      created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS leader_within_program_enrollments (
      id SERIAL PRIMARY KEY,
      participant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      program_id INTEGER REFERENCES leader_within_programs(id),
      cohort_id INTEGER REFERENCES leader_within_cohorts(id) ON DELETE SET NULL,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      location_id TEXT,
      enrolled_at TIMESTAMP DEFAULT NOW(),
      start_date DATE,
      status TEXT NOT NULL DEFAULT 'active',
      current_week INTEGER NOT NULL DEFAULT 1,
      current_session TEXT NOT NULL DEFAULT 'A',
      completed_at TIMESTAMP,
      is_demo BOOLEAN NOT NULL DEFAULT FALSE,
      created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (participant_id, program_id)
    );
    CREATE TABLE IF NOT EXISTS leader_within_session_progress (
      id SERIAL PRIMARY KEY,
      enrollment_id INTEGER REFERENCES leader_within_program_enrollments(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      session_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'locked',
      opened_at TIMESTAMP,
      checked_in_at TIMESTAMP,
      completed_at TIMESTAMP,
      completed_by TEXT,
      facilitator_verified_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      is_demo BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE (enrollment_id, week_number, session_code)
    );
    CREATE TABLE IF NOT EXISTS leader_within_practice_selections (
      id SERIAL PRIMARY KEY,
      enrollment_id INTEGER REFERENCES leader_within_program_enrollments(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      practice_id TEXT NOT NULL,
      selected_at TIMESTAMP DEFAULT NOW(),
      participant_reason TEXT,
      attempted_at TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'selected',
      reflection_summary TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (enrollment_id, week_number)
    );
    CREATE TABLE IF NOT EXISTS leader_within_reflections (
      id SERIAL PRIMARY KEY,
      enrollment_id INTEGER REFERENCES leader_within_program_enrollments(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      session_code TEXT NOT NULL,
      reflection_type TEXT NOT NULL,
      prompt_id TEXT,
      response_text TEXT NOT NULL,
      response_format TEXT NOT NULL DEFAULT 'text',
      visibility TEXT NOT NULL DEFAULT 'participant_and_facilitator',
      submitted_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS leader_within_shared_perspectives (
      id SERIAL PRIMARY KEY,
      enrollment_id INTEGER REFERENCES leader_within_program_enrollments(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      perspective_heard TEXT,
      idea_to_consider TEXT,
      group_difference TEXT,
      submitted_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS leader_within_assessment_snapshots (
      id SERIAL PRIMARY KEY,
      participant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      enrollment_id INTEGER REFERENCES leader_within_program_enrollments(id) ON DELETE CASCADE,
      result_reference TEXT,
      assessment_version TEXT,
      assessment_type TEXT NOT NULL DEFAULT 'leadership_youth',
      completed_at TIMESTAMP,
      primary_archetype TEXT,
      supporting_archetype TEXT,
      approved_strength_summary TEXT,
      approved_growth_summary TEXT,
      checkpoint_type TEXT NOT NULL DEFAULT 'baseline',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS leader_within_facilitator_notes (
      id SERIAL PRIMARY KEY,
      participant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      cohort_id INTEGER REFERENCES leader_within_cohorts(id) ON DELETE CASCADE,
      enrollment_id INTEGER REFERENCES leader_within_program_enrollments(id) ON DELETE CASCADE,
      author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      note_type TEXT NOT NULL DEFAULT 'private_facilitator_note',
      note_text TEXT NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'facilitator_private',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS leader_within_pocketpt_activity_summaries (
      id SERIAL PRIMARY KEY,
      enrollment_id INTEGER REFERENCES leader_within_program_enrollments(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      session_code TEXT NOT NULL,
      external_assignment_reference TEXT,
      assignment_status TEXT,
      completion_status TEXT,
      completed_at TIMESTAMP,
      effort_check_status TEXT,
      recovery_check_status TEXT,
      approved_coaching_summary TEXT,
      follow_up_flag BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE leader_within_cohorts ADD COLUMN IF NOT EXISTS assigned_facilitator_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE leader_within_cohorts ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE leader_within_cohorts ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE leader_within_program_enrollments ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE leader_within_program_enrollments ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE leader_within_session_progress ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
  `);
  await pool.query(`INSERT INTO leader_within_programs (slug,title,duration_weeks,version,status)
    VALUES ('the-leader-within-12-week','The Leader Within — 12-Week Program',12,'2026.07','active')
    ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, duration_weeks=EXCLUDED.duration_weeks, updated_at=NOW()`);
}
module.exports = { applyLeaderWithinMigrations };
