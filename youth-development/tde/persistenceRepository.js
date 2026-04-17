"use strict";

function createTdePersistenceRepository(pool = null) {
  const inMemory = {
    enrollments: [],
    weeklyProgress: [],
    checkpoints: [],
  };

  async function persistSignals(runId, signals) {
    if (!pool) return { persisted: 0 };
    for (const signal of signals) {
      await pool.query(
        `INSERT INTO tde_extracted_signals
          (run_id, signal_id, trait_code, signal_type, source_type, source_id, normalized_value, confidence_weight, evidence_status_tag, calibration_version, trace_ref, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
         ON CONFLICT (run_id, signal_id) DO NOTHING`,
        [
          runId,
          signal.signal_id,
          signal.trait_code,
          signal.signal_type,
          signal.source_type,
          signal.source_id,
          signal.normalized_value,
          signal.confidence_weight,
          signal.evidence_status_tag,
          signal.calibration_version,
          signal.trace_ref,
          JSON.stringify(signal),
        ]
      );
    }
    return { persisted: signals.length };
  }

  async function persistTraitScores(runId, calibrationVersion, traits) {
    if (!pool) return { persisted: 0 };
    for (const trait of traits) {
      await pool.query(
        `INSERT INTO tde_trait_score_traces
          (run_id, trait_code, evidence_sufficiency_status, reported_trait_score, internal_partial_score, confidence_score, calibration_version, trace_payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
        [
          runId,
          trait.trait_code,
          trait.evidence_sufficiency_status,
          trait.reported_trait_score,
          trait.internal_partial_score,
          trait.confidence_score,
          calibrationVersion,
          JSON.stringify(trait),
        ]
      );
    }
    return { persisted: traits.length };
  }

  async function persistStatements(runId, calibrationVersion, statements) {
    if (!pool) return { persisted: 0 };
    for (const statement of statements) {
      await pool.query(
        `INSERT INTO tde_report_statement_traces
          (run_id, statement_id, trait_code, rule_used, calibration_version, statement_payload)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)
         ON CONFLICT (run_id, statement_id) DO NOTHING`,
        [runId, statement.statement_id, statement.trait_code, statement.rule_used, calibrationVersion, JSON.stringify(statement)]
      );
    }
    return { persisted: statements.length };
  }

  async function persistCalibrationRef(runId, calibrationVersion, referencedBy) {
    if (!pool) return { persisted: 0 };
    await pool.query(
      `INSERT INTO tde_calibration_version_refs (run_id, calibration_version, referenced_by) VALUES ($1,$2,$3)`,
      [runId, calibrationVersion, referencedBy]
    );
    return { persisted: 1 };
  }

  async function persistAuditLog(runId, payload) {
    if (!pool) return { persisted: 0 };
    await pool.query(
      `INSERT INTO tde_pipeline_audit_log (run_id, child_id, session_id, calibration_version, status, audit_payload)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       ON CONFLICT (run_id) DO UPDATE SET status = EXCLUDED.status, audit_payload = EXCLUDED.audit_payload`,
      [runId, payload.child_id || null, payload.session_id || null, payload.calibration_version, payload.status, JSON.stringify(payload)]
    );
    return { persisted: 1 };
  }

  async function persistProgramEnrollment(enrollment) {
    if (!pool) {
      inMemory.enrollments = inMemory.enrollments.filter((entry) => entry.enrollment_id !== enrollment.enrollment_id);
      inMemory.enrollments.push(enrollment);
      return { persisted: 1, mode: "memory" };
    }

    await pool.query(
      `INSERT INTO tde_program_enrollments
        (enrollment_id, child_id, program_start_date, current_week, program_status, payload)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       ON CONFLICT (enrollment_id) DO UPDATE
       SET current_week = EXCLUDED.current_week,
           program_status = EXCLUDED.program_status,
           payload = EXCLUDED.payload,
           updated_at = NOW()`,
      [enrollment.enrollment_id, enrollment.child_id, enrollment.program_start_date, enrollment.current_week, enrollment.program_status, JSON.stringify(enrollment)]
    );

    if (enrollment.child_profile_tde) {
      await pool.query(
        `INSERT INTO tde_child_profiles
          (child_id, profile_version, payload)
         VALUES ($1,$2,$3::jsonb)
         ON CONFLICT (child_id) DO UPDATE
         SET profile_version = EXCLUDED.profile_version,
             payload = EXCLUDED.payload,
             updated_at = NOW()`,
        [enrollment.child_id, String(enrollment.child_profile_tde.profile_version || "phase3-v1"), JSON.stringify(enrollment.child_profile_tde)]
      );
    }

    if (enrollment.observer_records.length) {
      for (const observer of enrollment.observer_records) {
        await pool.query(
          `INSERT INTO tde_observer_records
            (observer_record_id, child_id, observer_type, observer_reference, linked_entity_type, linked_entity_id, payload)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
           ON CONFLICT (observer_record_id) DO UPDATE
           SET payload = EXCLUDED.payload,
               updated_at = NOW()`,
          [
            String(observer.observer_record_id || `${enrollment.enrollment_id}_observer_${observer.observer_reference || "unknown"}`),
            enrollment.child_id,
            String(observer.observer_type || "unknown"),
            String(observer.observer_reference || "unknown"),
            String(observer.linked_entity_type || "program_enrollment"),
            String(observer.linked_entity_id || enrollment.enrollment_id),
            JSON.stringify(observer),
          ]
        );
      }
    }

    await persistTargetCollections(enrollment.child_id, enrollment.active_domain_interests, enrollment.current_trait_targets, enrollment.current_environment_targets);
    return { persisted: 1, mode: "database" };
  }

  async function persistTargetCollections(childId, domainInterests, traitTargets, environmentTargets) {
    if (!pool) return;
    if (domainInterests.length) {
      await pool.query(
        `INSERT INTO tde_active_domain_interests (child_id, domains, payload)
         VALUES ($1,$2::jsonb,$3::jsonb)
         ON CONFLICT (child_id) DO UPDATE
         SET domains = EXCLUDED.domains,
             payload = EXCLUDED.payload,
             updated_at = NOW()`,
        [childId, JSON.stringify(domainInterests), JSON.stringify({ domains: domainInterests })]
      );
    }

    if (traitTargets.length) {
      await pool.query(
        `INSERT INTO tde_current_trait_targets (child_id, trait_targets, payload)
         VALUES ($1,$2::jsonb,$3::jsonb)
         ON CONFLICT (child_id) DO UPDATE
         SET trait_targets = EXCLUDED.trait_targets,
             payload = EXCLUDED.payload,
             updated_at = NOW()`,
        [childId, JSON.stringify(traitTargets), JSON.stringify({ trait_targets: traitTargets })]
      );
    }

    if (environmentTargets.length) {
      await pool.query(
        `INSERT INTO tde_current_environment_targets (child_id, environment_targets, payload)
         VALUES ($1,$2::jsonb,$3::jsonb)
         ON CONFLICT (child_id) DO UPDATE
         SET environment_targets = EXCLUDED.environment_targets,
             payload = EXCLUDED.payload,
             updated_at = NOW()`,
        [childId, JSON.stringify(environmentTargets), JSON.stringify({ environment_targets: environmentTargets })]
      );
    }
  }

  async function persistWeeklyProgress(progress) {
    if (!pool) {
      inMemory.weeklyProgress = inMemory.weeklyProgress.filter((entry) => entry.progress_id !== progress.progress_id);
      inMemory.weeklyProgress.push(progress);
      if (progress.checkpoint_record) inMemory.checkpoints.push(progress.checkpoint_record);
      return { persisted: 1, mode: "memory" };
    }

    await pool.query(
      `INSERT INTO tde_weekly_progress_records
        (progress_id, enrollment_id, child_id, week_number, completion_status, payload)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       ON CONFLICT (progress_id) DO UPDATE
       SET completion_status = EXCLUDED.completion_status,
           payload = EXCLUDED.payload,
           updated_at = NOW()`,
      [progress.progress_id, progress.enrollment_id, progress.child_id, progress.week_number, progress.completion_status, JSON.stringify(progress)]
    );

    if (progress.session_record) {
      await pool.query(
        `INSERT INTO tde_session_records
          (session_id, progress_id, enrollment_id, child_id, week_number, session_template_type, observation_entry_type, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
         ON CONFLICT (session_id) DO UPDATE
         SET payload = EXCLUDED.payload,
             updated_at = NOW()`,
        [
          String(progress.session_record.session_id || `${progress.progress_id}_session`),
          progress.progress_id,
          progress.enrollment_id,
          progress.child_id,
          progress.week_number,
          String(progress.session_record.session_template_type || "weekly_session_template"),
          String(progress.session_record.observation_entry_type || "task_event_observation"),
          JSON.stringify(progress.session_record),
        ]
      );
    }

    if (progress.checkpoint_record) {
      await pool.query(
        `INSERT INTO tde_checkpoint_records
          (checkpoint_id, enrollment_id, child_id, week_number, checkpoint_type, environment_review_flag, confidence_review_flag, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
         ON CONFLICT (checkpoint_id) DO UPDATE
         SET payload = EXCLUDED.payload,
             updated_at = NOW()`,
        [
          String(progress.checkpoint_record.checkpoint_id),
          progress.enrollment_id,
          progress.child_id,
          progress.week_number,
          String(progress.checkpoint_record.checkpoint_type || "reassessment_checkpoint"),
          progress.checkpoint_record.environment_review_flag !== false,
          progress.checkpoint_record.confidence_review_flag !== false,
          JSON.stringify(progress.checkpoint_record),
        ]
      );
    }

    await persistTargetCollections(progress.child_id, [], [], progress.current_environment_targets);
    return { persisted: 1, mode: "database" };
  }

  return {
    persistSignals,
    persistTraitScores,
    persistStatements,
    persistCalibrationRef,
    persistAuditLog,
    persistProgramEnrollment,
    persistWeeklyProgress,
  };
}

module.exports = {
  createTdePersistenceRepository,
};
