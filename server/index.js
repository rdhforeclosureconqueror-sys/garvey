app.post("/intake", async (req, res) => {
  try {
    const { email, tenant_slug, mode, answers } = req.body;

    /* =========================
       🔥 STEP 1: ENSURE TENANT EXISTS (PUT IT HERE)
    ========================= */

    let tenant = await getTenant(tenant_slug);

    if (!tenant) {
      const newTenant = await pool.query(
        "INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING *",
        [tenant_slug, tenant_slug]
      );

      tenant = newTenant.rows[0];
    }

    /* =========================
       STEP 2: CREATE SESSION
    ========================= */

    const sessionResult = await pool.query(
      "INSERT INTO intake_sessions (email, tenant_slug, mode) VALUES ($1, $2, $3) RETURNING *",
      [email, tenant_slug, mode]
    );

    const session = sessionResult.rows[0];

    /* =========================
       STEP 3: SAVE RESPONSES
    ========================= */

    for (let i = 0; i < answers.length; i++) {
      await pool.query(
        "INSERT INTO intake_responses (session_id, question_id, answer) VALUES ($1, $2, $3)",
        [session.id, i + 1, answers[i]]
      );
    }

    /* =========================
       STEP 4: SCORE
    ========================= */

    const roleScores = scoreAssessment(answers);
    const { primary, secondary } = getTopRoles(roleScores);

    /* =========================
       STEP 5: RECOMMENDATIONS
    ========================= */

    const recommendations = generateRecommendations(primary, secondary);

    /* =========================
       STEP 6: SAVE RESULTS
    ========================= */

    await pool.query(
      "INSERT INTO intake_results (session_id, primary_role, secondary_role, role_scores, recommendations) VALUES ($1, $2, $3, $4, $5)",
      [
        session.id,
        primary,
        secondary,
        roleScores,
        recommendations
      ]
    );

    /* =========================
       STEP 7: RESPONSE
    ========================= */

    res.json({
      success: true,
      primary_role: primary,
      secondary_role: secondary,
      scores: roleScores,
      recommendations
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Intake failed" });
  }
});
