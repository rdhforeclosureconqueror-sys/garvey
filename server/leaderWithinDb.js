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
      organization_id TEXT,
      start_date DATE,
      capacity INTEGER,
      alternate_story_title TEXT,
      is_demo BOOLEAN NOT NULL DEFAULT FALSE,
      created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS leader_within_participants (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      location_id TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      preferred_name TEXT NOT NULL,
      nickname TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      consent_status TEXT NOT NULL DEFAULT 'pending',
      consent_recorded_at TIMESTAMP,
      consent_source TEXT,
      consent_recorded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS leader_within_participant_credentials (
      id SERIAL PRIMARY KEY,
      participant_id INTEGER REFERENCES leader_within_participants(id) ON DELETE CASCADE,
      leader_id TEXT NOT NULL UNIQUE,
      secret_hash TEXT NOT NULL,
      secret_type TEXT NOT NULL DEFAULT 'pin',
      temporary BOOLEAN NOT NULL DEFAULT TRUE,
      must_change BOOLEAN NOT NULL DEFAULT TRUE,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TIMESTAMP,
      last_login_at TIMESTAMP,
      credential_version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS leader_within_participant_sessions (
      id SERIAL PRIMARY KEY,
      participant_id INTEGER REFERENCES leader_within_participants(id) ON DELETE CASCADE,
      enrollment_id INTEGER REFERENCES leader_within_program_enrollments(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      credential_version INTEGER NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS leader_within_facilitator_accounts (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      organization_id TEXT,
      location_id TEXT,
      linked_garvey_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      facilitator_id TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      normalized_email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      setup_token_hash TEXT,
      setup_token_expires_at TIMESTAMP,
      first_name TEXT,
      last_name TEXT,
      preferred_name TEXT,
      status TEXT NOT NULL DEFAULT 'invited',
      role TEXT NOT NULL DEFAULT 'facilitator',
      must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TIMESTAMP,
      last_login_at TIMESTAMP,
      credential_version INTEGER NOT NULL DEFAULT 1,
      created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approved_by_facilitator_account_id INTEGER REFERENCES leader_within_facilitator_accounts(id) ON DELETE SET NULL,
      approved_at TIMESTAMP,
      suspended_at TIMESTAMP,
      disabled_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (tenant_id, normalized_email)
    );
    CREATE TABLE IF NOT EXISTS leader_within_facilitator_requests (
      id SERIAL PRIMARY KEY,
      normalized_email TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      preferred_name TEXT NOT NULL,
      organization_name TEXT NOT NULL,
      requested_location TEXT NOT NULL,
      phone_number TEXT,
      existing_relationship TEXT,
      organization_role TEXT,
      request_reason TEXT NOT NULL,
      request_notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_at TIMESTAMP DEFAULT NOW(),
      reviewed_at TIMESTAMP,
      reviewed_by_facilitator_account_id INTEGER REFERENCES leader_within_facilitator_accounts(id) ON DELETE SET NULL,
      review_notes TEXT,
      converted_facilitator_account_id INTEGER REFERENCES leader_within_facilitator_accounts(id) ON DELETE SET NULL,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS leader_within_facilitator_sessions (
      id SERIAL PRIMARY KEY,
      facilitator_account_id INTEGER REFERENCES leader_within_facilitator_accounts(id) ON DELETE CASCADE,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      credential_version INTEGER NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      last_seen_at TIMESTAMP,
      user_agent_hash TEXT,
      ip_hash TEXT
    );
    CREATE TABLE IF NOT EXISTS leader_within_cohort_facilitators (
      id SERIAL PRIMARY KEY,
      cohort_id INTEGER REFERENCES leader_within_cohorts(id) ON DELETE CASCADE,
      facilitator_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      facilitator_account_id INTEGER REFERENCES leader_within_facilitator_accounts(id) ON DELETE CASCADE,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      assignment_role TEXT NOT NULL DEFAULT 'primary',
      status TEXT NOT NULL DEFAULT 'active',
      assigned_at TIMESTAMP DEFAULT NOW(),
      assigned_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      removed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (cohort_id, facilitator_user_id),
      UNIQUE (cohort_id, facilitator_account_id)
    );
    CREATE TABLE IF NOT EXISTS leader_within_audit_events (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      participant_id INTEGER REFERENCES leader_within_participants(id) ON DELETE SET NULL,
      cohort_id INTEGER REFERENCES leader_within_cohorts(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
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
    ALTER TABLE leader_within_cohorts ADD COLUMN IF NOT EXISTS organization_id TEXT;
    ALTER TABLE leader_within_cohorts ADD COLUMN IF NOT EXISTS start_date DATE;
    ALTER TABLE leader_within_cohorts ADD COLUMN IF NOT EXISTS capacity INTEGER;
    ALTER TABLE leader_within_program_enrollments ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE leader_within_program_enrollments ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE leader_within_session_progress ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE leader_within_program_enrollments ADD COLUMN IF NOT EXISTS leader_within_participant_id INTEGER REFERENCES leader_within_participants(id) ON DELETE CASCADE;
    ALTER TABLE leader_within_facilitator_accounts ADD COLUMN IF NOT EXISTS setup_token_hash TEXT;
    ALTER TABLE leader_within_facilitator_accounts ADD COLUMN IF NOT EXISTS setup_token_expires_at TIMESTAMP;
    ALTER TABLE leader_within_facilitator_accounts ADD COLUMN IF NOT EXISTS approved_by_facilitator_account_id INTEGER REFERENCES leader_within_facilitator_accounts(id) ON DELETE SET NULL;
    ALTER TABLE leader_within_facilitator_accounts ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
    ALTER TABLE leader_within_facilitator_accounts ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP;
    ALTER TABLE leader_within_cohort_facilitators ADD COLUMN IF NOT EXISTS facilitator_account_id INTEGER REFERENCES leader_within_facilitator_accounts(id) ON DELETE CASCADE;
    ALTER TABLE leader_within_cohort_facilitators ALTER COLUMN facilitator_user_id DROP NOT NULL;
    ALTER TABLE leader_within_cohort_facilitators ALTER COLUMN assigned_by_user_id DROP NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_lw_facilitator_requests_pending_email ON leader_within_facilitator_requests (normalized_email) WHERE status IN ('pending','more_information_requested');
    CREATE INDEX IF NOT EXISTS idx_lw_facilitator_requests_status ON leader_within_facilitator_requests (status, submitted_at);
    CREATE INDEX IF NOT EXISTS idx_lw_facilitator_accounts_email ON leader_within_facilitator_accounts (tenant_id, normalized_email);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_lw_facilitator_accounts_linked_user ON leader_within_facilitator_accounts (linked_garvey_user_id) WHERE linked_garvey_user_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_lw_facilitator_accounts_code ON leader_within_facilitator_accounts (lower(facilitator_id));
    CREATE INDEX IF NOT EXISTS idx_lw_facilitator_sessions_token_hash ON leader_within_facilitator_sessions (token_hash);
    CREATE INDEX IF NOT EXISTS idx_lw_cohort_facilitator_accounts_active ON leader_within_cohort_facilitators (cohort_id, facilitator_account_id, tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_lw_credentials_leader_id_lower ON leader_within_participant_credentials (lower(leader_id));
    CREATE INDEX IF NOT EXISTS idx_lw_sessions_token_hash ON leader_within_participant_sessions (token_hash);
    CREATE INDEX IF NOT EXISTS idx_lw_cohort_facilitators_active ON leader_within_cohort_facilitators (cohort_id, facilitator_user_id, tenant_id, status);
    INSERT INTO leader_within_cohort_facilitators (cohort_id, facilitator_user_id, tenant_id, assignment_role, status)
      SELECT id, assigned_facilitator_user_id, tenant_id, 'primary', 'active'
      FROM leader_within_cohorts
      WHERE assigned_facilitator_user_id IS NOT NULL
      ON CONFLICT (cohort_id, facilitator_user_id) DO UPDATE SET status='active', updated_at=NOW();
  `);
  await pool.query(`INSERT INTO leader_within_programs (slug,title,duration_weeks,version,status)
    VALUES ('the-leader-within-12-week','The Leader Within — 12-Week Program',12,'2026.07','active'),
           ('the-leader-within-8-week','The Leader Within — 8-Week Program',8,'2026.07','active'),
           ('the-leader-within-32-week','The Leader Within — 32-Week Program',32,'2026.07','active')
    ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, duration_weeks=EXCLUDED.duration_weeks, status=EXCLUDED.status, updated_at=NOW()`);
  console.info(JSON.stringify({event:"leader_within_schema_migration_checked", migration:"leader_within_bootstrap_v4", applied:true, schema_version:"leader_within_bootstrap_v4"}));
}
module.exports = { applyLeaderWithinMigrations };
