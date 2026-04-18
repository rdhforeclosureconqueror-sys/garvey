"use strict";

function createTdePersistenceRepository(pool = null) {
  const inMemory = {
    enrollments: [],
    weeklyProgress: [],
    checkpoints: [],
    observerConsents: [],
    environmentHooks: [],
    validationExports: [],
    calibrationRefs: [],
    commitmentPlans: [],
    interventionSessions: [],
    developmentCheckins: [],
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
    if (!pool) {
      inMemory.calibrationRefs.push({ run_id: runId, calibration_version: calibrationVersion, referenced_by: referencedBy });
      return { persisted: 1, mode: "memory" };
    }
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

  async function persistObserverConsent(consent) {
    if (!pool) {
      inMemory.observerConsents = inMemory.observerConsents.filter(
        (entry) => !(entry.child_id === consent.child_id && entry.observer_id === consent.observer_id)
      );
      inMemory.observerConsents.push(consent);
      return { persisted: 1, mode: "memory" };
    }

    await pool.query(
      `INSERT INTO tde_observer_consent_records
        (observer_id, child_id, observer_role, relationship_duration, consent_status, consent_captured_at, consent_source, provenance_source_type, provenance_source_ref, submission_context, tenant_id, user_id, audit_ref, policy_version, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb)
       ON CONFLICT (observer_id, child_id) DO UPDATE
       SET observer_role = EXCLUDED.observer_role,
           relationship_duration = EXCLUDED.relationship_duration,
           consent_status = EXCLUDED.consent_status,
           consent_captured_at = EXCLUDED.consent_captured_at,
           consent_source = EXCLUDED.consent_source,
           provenance_source_type = EXCLUDED.provenance_source_type,
           provenance_source_ref = EXCLUDED.provenance_source_ref,
           submission_context = EXCLUDED.submission_context,
           tenant_id = EXCLUDED.tenant_id,
           user_id = EXCLUDED.user_id,
           audit_ref = EXCLUDED.audit_ref,
           policy_version = EXCLUDED.policy_version,
           payload = EXCLUDED.payload,
           updated_at = NOW()`,
      [
        consent.observer_id,
        consent.child_id,
        consent.observer_role,
        consent.relationship_duration,
        consent.consent_status,
        consent.consent_captured_at,
        consent.consent_source,
        consent.provenance_source_type,
        consent.provenance_source_ref,
        consent.submission_context,
        consent.tenant_id,
        consent.user_id,
        consent.audit_ref,
        consent.policy_version,
        JSON.stringify(consent),
      ]
    );
    return { persisted: 1, mode: "database" };
  }

  async function persistEnvironmentHookEvent(event) {
    if (!pool) {
      inMemory.environmentHooks.push(event);
      return { persisted: 1, mode: "memory" };
    }
    await pool.query(
      `INSERT INTO tde_environment_hook_events
        (event_id, child_id, environment_factor, event_type, source_type, source_ref, raw_value, event_payload, normalized_value, confidence_weight, timestamp, calibration_version, trace_ref, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14::jsonb)
       ON CONFLICT (event_id) DO UPDATE
       SET environment_factor = EXCLUDED.environment_factor,
           event_type = EXCLUDED.event_type,
           source_type = EXCLUDED.source_type,
           source_ref = EXCLUDED.source_ref,
           raw_value = EXCLUDED.raw_value,
           event_payload = EXCLUDED.event_payload,
           normalized_value = EXCLUDED.normalized_value,
           confidence_weight = EXCLUDED.confidence_weight,
           timestamp = EXCLUDED.timestamp,
           calibration_version = EXCLUDED.calibration_version,
           trace_ref = EXCLUDED.trace_ref,
           payload = EXCLUDED.payload,
           updated_at = NOW()`,
      [
        event.event_id,
        event.child_id,
        event.environment_factor,
        event.event_type,
        event.source_type,
        event.source_ref,
        event.raw_value === null ? null : String(event.raw_value),
        JSON.stringify(event.event_payload || {}),
        event.normalized_value,
        event.confidence_weight,
        event.timestamp,
        event.calibration_version,
        event.trace_ref,
        JSON.stringify(event),
      ]
    );
    return { persisted: 1, mode: "database" };
  }

  async function getProgramSnapshot(childId) {
    if (!pool) {
      const enrollment = [...inMemory.enrollments]
        .filter((entry) => entry.child_id === childId)
        .sort((a, b) => Date.parse(a.created_at || 0) - Date.parse(b.created_at || 0))
        .at(-1) || null;
      const progressRecords = inMemory.weeklyProgress.filter((entry) => entry.child_id === childId);
      const observerConsents = inMemory.observerConsents.filter((entry) => entry.child_id === childId);
      const environmentHooks = inMemory.environmentHooks.filter((entry) => entry.child_id === childId);
      const commitmentPlan = inMemory.commitmentPlans.find((entry) => entry.child_id === childId) || null;
      const interventionSessions = inMemory.interventionSessions.filter((entry) => entry.child_id === childId);
      const developmentCheckins = inMemory.developmentCheckins.filter((entry) => entry.child_id === childId);
      return { enrollment, progress_records: progressRecords, observer_consents: observerConsents, environment_hooks: environmentHooks, commitment_plan: commitmentPlan, intervention_sessions: interventionSessions, development_checkins: developmentCheckins };
    }

    const enrollmentRows = await pool.query(
      `SELECT payload FROM tde_program_enrollments WHERE child_id = $1 ORDER BY updated_at DESC, created_at DESC LIMIT 1`,
      [childId]
    );
    const progressRows = await pool.query(
      `SELECT payload FROM tde_weekly_progress_records WHERE child_id = $1 ORDER BY week_number ASC`,
      [childId]
    );
    const observerRows = await pool.query(
      `SELECT payload FROM tde_observer_consent_records WHERE child_id = $1 ORDER BY updated_at DESC, created_at DESC`,
      [childId]
    );
    const environmentRows = await pool.query(
      `SELECT payload FROM tde_environment_hook_events WHERE child_id = $1 ORDER BY timestamp ASC, created_at ASC`,
      [childId]
    );
    const commitmentRows = await pool.query(`SELECT payload FROM tde_commitment_plans WHERE child_id = $1 LIMIT 1`, [childId]);
    const interventionRows = await pool.query(`SELECT payload FROM tde_intervention_sessions WHERE child_id = $1 ORDER BY completed_at ASC`, [childId]);
    const checkinRows = await pool.query(`SELECT payload FROM tde_development_checkins WHERE child_id = $1 ORDER BY completed_at ASC`, [childId]);
    return {
      enrollment: enrollmentRows.rows[0]?.payload || null,
      progress_records: progressRows.rows.map((row) => row.payload || {}),
      observer_consents: observerRows.rows.map((row) => row.payload || {}),
      environment_hooks: environmentRows.rows.map((row) => row.payload || {}),
      commitment_plan: commitmentRows.rows[0]?.payload || null,
      intervention_sessions: interventionRows.rows.map((row) => row.payload || {}),
      development_checkins: checkinRows.rows.map((row) => row.payload || {}),
    };
  }

  async function getValidationDataset(request) {
    const snapshotRows = !pool
      ? {
          consents: inMemory.observerConsents.filter((entry) => entry.tenant_id === request.tenant_id),
          hooks: inMemory.environmentHooks,
          progress: inMemory.weeklyProgress,
          enrollments: inMemory.enrollments,
        }
      : {
          consents: (await pool.query(`SELECT payload FROM tde_observer_consent_records WHERE tenant_id = $1`, [request.tenant_id])).rows.map((row) => row.payload || {}),
          hooks: (await pool.query(`SELECT payload FROM tde_environment_hook_events ORDER BY timestamp ASC`)).rows.map((row) => row.payload || {}),
          progress: (await pool.query(`SELECT payload FROM tde_weekly_progress_records ORDER BY week_number ASC`)).rows.map((row) => row.payload || {}),
          enrollments: (await pool.query(`SELECT payload FROM tde_program_enrollments ORDER BY updated_at DESC`)).rows.map((row) => row.payload || {}),
        };

    const selectedChildIds = Array.isArray(request.selection.child_ids) ? new Set(request.selection.child_ids.map((entry) => String(entry))) : null;
    const includeChild = (childId) => !selectedChildIds || selectedChildIds.has(String(childId || ""));

    return {
      observer_consents: snapshotRows.consents.filter((entry) => includeChild(entry.child_id)),
      environment_hooks: snapshotRows.hooks.filter((entry) => includeChild(entry.child_id)),
      weekly_progress: snapshotRows.progress.filter((entry) => includeChild(entry.child_id)),
      enrollments: snapshotRows.enrollments.filter((entry) => includeChild(entry.child_id)),
    };
  }

  async function persistValidationExportLog(exportPayload) {
    if (!pool) {
      inMemory.validationExports.push(exportPayload);
      return { persisted: 1, mode: "memory" };
    }
    await pool.query(
      `INSERT INTO tde_validation_export_logs
        (job_id, study_type, tenant_id, requested_by, audit_ref, calibration_version, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
       ON CONFLICT (job_id) DO UPDATE
       SET study_type = EXCLUDED.study_type,
           tenant_id = EXCLUDED.tenant_id,
           requested_by = EXCLUDED.requested_by,
           audit_ref = EXCLUDED.audit_ref,
           calibration_version = EXCLUDED.calibration_version,
           payload = EXCLUDED.payload,
           updated_at = NOW()`,
      [
        exportPayload.job_id,
        exportPayload.study_type,
        exportPayload.tenant_id,
        exportPayload.requested_by || "extension_export_api",
        exportPayload.audit_ref,
        exportPayload.calibration_version,
        JSON.stringify(exportPayload),
      ]
    );
    return { persisted: 1, mode: "database" };
  }


  async function listValidationExportLogs() {
    if (!pool) {
      return [...inMemory.validationExports].sort((a, b) => `${a.job_id || ""}`.localeCompare(`${b.job_id || ""}`));
    }
    const rows = await pool.query(`SELECT payload FROM tde_validation_export_logs ORDER BY job_id ASC`);
    return rows.rows.map((row) => row.payload || {});
  }

  async function listCalibrationVersions() {
    if (!pool) {
      const versions = inMemory.calibrationRefs.map((entry) => entry.calibration_version);
      if (!versions.length) versions.push("tde-calibration-v0");
      return [...new Set(versions)].sort();
    }
    const rows = await pool.query(`SELECT DISTINCT calibration_version FROM tde_calibration_version_refs ORDER BY calibration_version ASC`);
    const versions = rows.rows.map((row) => String(row.calibration_version || "").trim()).filter(Boolean);
    if (!versions.length) versions.push("tde-calibration-v0");
    return [...new Set(versions)].sort();
  }
  async function persistCommitmentPlan(plan) {
    if (!pool) {
      inMemory.commitmentPlans = inMemory.commitmentPlans.filter((entry) => entry.child_id !== plan.child_id);
      inMemory.commitmentPlans.push(plan);
      return { persisted: 1, mode: "memory" };
    }

    await pool.query(
      `INSERT INTO tde_commitment_plans
        (child_id, committed_days_per_week, preferred_days, preferred_time_window, session_length, facilitator_role, payload)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7::jsonb)
       ON CONFLICT (child_id) DO UPDATE
       SET committed_days_per_week = EXCLUDED.committed_days_per_week,
           preferred_days = EXCLUDED.preferred_days,
           preferred_time_window = EXCLUDED.preferred_time_window,
           session_length = EXCLUDED.session_length,
           facilitator_role = EXCLUDED.facilitator_role,
           payload = EXCLUDED.payload,
           updated_at = NOW()`,
      [
        plan.child_id,
        plan.committed_days_per_week,
        JSON.stringify(plan.preferred_days),
        plan.preferred_time_window,
        plan.target_session_length,
        plan.facilitator_role,
        JSON.stringify(plan),
      ]
    );
    return { persisted: 1, mode: "database" };
  }

  async function getCommitmentPlan(childId) {
    if (!pool) {
      return inMemory.commitmentPlans.find((entry) => entry.child_id === childId) || null;
    }
    const rows = await pool.query(`SELECT payload FROM tde_commitment_plans WHERE child_id = $1 LIMIT 1`, [childId]);
    return rows.rows[0]?.payload || null;
  }

  async function persistInterventionSession(session) {
    if (!pool) {
      inMemory.interventionSessions = inMemory.interventionSessions.filter((entry) => entry.session_id !== session.session_id);
      inMemory.interventionSessions.push(session);
      return { persisted: 1, mode: "memory" };
    }

    await pool.query(
      `INSERT INTO tde_intervention_sessions
        (session_id, child_id, full_session_completed, duration_minutes, challenge_level, parent_coaching_style, payload, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
       ON CONFLICT (session_id) DO UPDATE
       SET full_session_completed = EXCLUDED.full_session_completed,
           duration_minutes = EXCLUDED.duration_minutes,
           challenge_level = EXCLUDED.challenge_level,
           parent_coaching_style = EXCLUDED.parent_coaching_style,
           payload = EXCLUDED.payload,
           completed_at = EXCLUDED.completed_at,
           updated_at = NOW()`,
      [
        session.session_id,
        session.child_id,
        session.full_session_completed === true,
        session.duration_minutes,
        session.challenge_level,
        session.parent_coaching_style,
        JSON.stringify(session),
        session.completed_at,
      ]
    );
    return { persisted: 1, mode: "database" };
  }

  async function listInterventionSessions(childId) {
    if (!pool) {
      return inMemory.interventionSessions.filter((entry) => entry.child_id === childId);
    }
    const rows = await pool.query(`SELECT payload FROM tde_intervention_sessions WHERE child_id = $1 ORDER BY completed_at ASC`, [childId]);
    return rows.rows.map((row) => row.payload || {});
  }


  async function persistDevelopmentCheckin(checkin) {
    if (!pool) {
      inMemory.developmentCheckins = inMemory.developmentCheckins.filter((entry) => entry.checkin_id !== checkin.checkin_id);
      inMemory.developmentCheckins.push(checkin);
      return { persisted: 1, mode: "memory" };
    }

    await pool.query(
      `INSERT INTO tde_development_checkins
        (checkin_id, child_id, program_week, checkin_due, completed_at, evidence_source_type, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
       ON CONFLICT (checkin_id) DO UPDATE
       SET program_week = EXCLUDED.program_week,
           checkin_due = EXCLUDED.checkin_due,
           completed_at = EXCLUDED.completed_at,
           evidence_source_type = EXCLUDED.evidence_source_type,
           payload = EXCLUDED.payload,
           updated_at = NOW()`,
      [
        checkin.checkin_id,
        checkin.child_id,
        checkin.program_week,
        checkin.checkin_due === true,
        checkin.completed_at,
        checkin.evidence_source_type || "development_checkin",
        JSON.stringify(checkin),
      ]
    );
    return { persisted: 1, mode: "database" };
  }

  async function listDevelopmentCheckins(childId) {
    if (!pool) {
      return inMemory.developmentCheckins
        .filter((entry) => entry.child_id === childId)
        .sort((a, b) => `${a.completed_at || ""}`.localeCompare(`${b.completed_at || ""}`));
    }
    const rows = await pool.query(`SELECT payload FROM tde_development_checkins WHERE child_id = $1 ORDER BY completed_at ASC`, [childId]);
    return rows.rows.map((row) => row.payload || {});
  }

  return {
    persistSignals,
    persistTraitScores,
    persistStatements,
    persistCalibrationRef,
    persistAuditLog,
    persistProgramEnrollment,
    persistWeeklyProgress,
    persistObserverConsent,
    persistEnvironmentHookEvent,
    getProgramSnapshot,
    getValidationDataset,
    persistValidationExportLog,
    listValidationExportLogs,
    listCalibrationVersions,
    persistCommitmentPlan,
    getCommitmentPlan,
    persistInterventionSession,
    listInterventionSessions,
    persistDevelopmentCheckin,
    listDevelopmentCheckins,
  };
}

module.exports = {
  createTdePersistenceRepository,
};
