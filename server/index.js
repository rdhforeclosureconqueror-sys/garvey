const express = require("express");
const path = require("path");
const { pool, initializeDatabase } = require("./db");
const { ensureTenant, getTenantBySlug, getTenantConfig } = require("./tenant");
const {
  scoreAssessment,
  getTopRoles,
  generateRecommendations,
  generateTenantConfig
} = require("./biiEngine");
const { runVerification } = require("./verify");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const ACTION_POINTS = {
  review: 5,
  photo: 10,
  video: 20,
  referral: 15
};

function logEvent(event, payload = {}) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...payload
    })
  );
}

async function ensureTenantUser(tenantId, email) {
  const existing = await pool.query(
    "SELECT * FROM users WHERE tenant_id = $1 AND email = $2",
    [tenantId, email]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const created = await pool.query(
    "INSERT INTO users (tenant_id, email) VALUES ($1, $2) RETURNING *",
    [tenantId, email]
  );

  return created.rows[0];
}

async function tenantMiddleware(req, res, next) {
  const { slug } = req.params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found", tenant_slug: slug });
  }

  req.tenant = tenant;
  req.tenantConfig = await getTenantConfig(tenant.id);
  return next();
}

function rewardPointsEnabled(config) {
  return config.reward_system !== false;
}

app.get("/join/:slug", async (req, res) => {
  const tenant = await getTenantBySlug(req.params.slug);
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  return res.redirect(`/intake.html?tenant=${tenant.slug}`);
});

app.post("/t/:slug/checkin", tenantMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const user = await ensureTenantUser(req.tenant.id, email);
    const pointsToAdd = rewardPointsEnabled(req.tenantConfig) ? 5 : 0;

    await pool.query(
      "INSERT INTO visits (tenant_id, user_id, points_awarded) VALUES ($1, $2, $3)",
      [req.tenant.id, user.id, pointsToAdd]
    );

    const updatedUser = await pool.query(
      "UPDATE users SET points = points + $1 WHERE id = $2 AND tenant_id = $3 RETURNING id, email, points",
      [pointsToAdd, user.id, req.tenant.id]
    );

    return res.json({
      success: true,
      tenant: req.tenant.slug,
      event: "checkin",
      points_added: pointsToAdd,
      points: updatedUser.rows[0].points,
      message: pointsToAdd > 0 ? `You earned ${pointsToAdd} points!` : "Rewards are disabled for this tenant."
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "checkin failed" });
  }
});

app.post("/t/:slug/action", tenantMiddleware, async (req, res) => {
  try {
    const { email, action_type: actionType } = req.body;
    if (!email || !actionType) {
      return res.status(400).json({ error: "email and action_type are required" });
    }

    const basePoints = ACTION_POINTS[actionType] || 0;
    const points = rewardPointsEnabled(req.tenantConfig) ? basePoints : 0;
    const user = await ensureTenantUser(req.tenant.id, email);

    await pool.query(
      "INSERT INTO actions (tenant_id, user_id, action_type, points_awarded) VALUES ($1, $2, $3, $4)",
      [req.tenant.id, user.id, actionType, points]
    );

    const updatedUser = await pool.query(
      "UPDATE users SET points = points + $1 WHERE id = $2 AND tenant_id = $3 RETURNING id, email, points",
      [points, user.id, req.tenant.id]
    );

    return res.json({
      success: true,
      tenant: req.tenant.slug,
      action_type: actionType,
      points_added: points,
      points: updatedUser.rows[0].points,
      message: points > 0 ? `You earned ${points} points!` : "Action tracked. Rewards currently disabled."
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "action failed" });
  }
});

app.post("/t/:slug/review", tenantMiddleware, async (req, res) => {
  try {
    if (req.tenantConfig.content_engine === false) {
      return res.status(403).json({ error: "review system disabled for this tenant" });
    }

    const { email, text, media_type: mediaType } = req.body;
    if (!email || !text) {
      return res.status(400).json({ error: "email and text are required" });
    }

    const user = await ensureTenantUser(req.tenant.id, email);
    const mediaBonus = mediaType === "video" ? 10 : mediaType === "photo" ? 5 : 0;
    const points = rewardPointsEnabled(req.tenantConfig) ? 5 + mediaBonus : 0;

    const reviewResult = await pool.query(
      `INSERT INTO reviews (tenant_id, user_id, text, media_type, points_awarded)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.tenant.id, user.id, text, mediaType || null, points]
    );

    const updatedUser = await pool.query(
      "UPDATE users SET points = points + $1 WHERE id = $2 AND tenant_id = $3 RETURNING points",
      [points, user.id, req.tenant.id]
    );

    return res.json({
      success: true,
      review: reviewResult.rows[0],
      points_added: points,
      points: updatedUser.rows[0].points,
      message: points > 0 ? `Thanks! You earned ${points} points for your review.` : "Thanks! Review captured."
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "review failed" });
  }
});

app.post("/t/:slug/referral", tenantMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    if (req.tenantConfig.referral_system === false) {
      return res.status(403).json({ error: "referral system disabled for this tenant" });
    }

    const { email, referred_email: referredEmail } = req.body;
    if (!email || !referredEmail) {
      return res.status(400).json({ error: "email and referred_email are required" });
    }

    await client.query("BEGIN");

    const referrer = await ensureTenantUser(req.tenant.id, email);
    const referred = await ensureTenantUser(req.tenant.id, referredEmail);
    const pointsEach = rewardPointsEnabled(req.tenantConfig) ? 10 : 0;

    await client.query(
      `INSERT INTO referrals (tenant_id, referrer_user_id, referred_user_id, points_awarded_each)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, referrer_user_id, referred_user_id)
       DO NOTHING`,
      [req.tenant.id, referrer.id, referred.id, pointsEach]
    );

    if (pointsEach > 0) {
      await client.query(
        "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id IN ($3, $4)",
        [pointsEach, req.tenant.id, referrer.id, referred.id]
      );
    }

    const pointsRows = await client.query(
      "SELECT email, points FROM users WHERE tenant_id = $1 AND id IN ($2, $3)",
      [req.tenant.id, referrer.id, referred.id]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      points_awarded_each: pointsEach,
      users: pointsRows.rows,
      message:
        pointsEach > 0
          ? `Referral success! Both users earned ${pointsEach} points.`
          : "Referral tracked. Rewards are disabled."
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "referral failed" });
  } finally {
    client.release();
  }
});

app.post("/t/:slug/wishlist", tenantMiddleware, async (req, res) => {
  try {
    const { email, product_name: productName } = req.body;
    if (!email || !productName) {
      return res.status(400).json({ error: "email and product_name are required" });
    }

    const user = await ensureTenantUser(req.tenant.id, email);
    const result = await pool.query(
      "INSERT INTO wishlist (tenant_id, user_id, product_name) VALUES ($1, $2, $3) RETURNING *",
      [req.tenant.id, user.id, productName]
    );

    return res.json({ success: true, wishlist_entry: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "wishlist failed" });
  }
});

app.get("/t/:slug/dashboard", tenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant.id;

    const [users, visits, actions, points, topActions, pointsDistribution, dailyActivity] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total_users FROM users WHERE tenant_id = $1", [tenantId]),
      pool.query("SELECT COUNT(*)::int AS total_visits FROM visits WHERE tenant_id = $1", [tenantId]),
      pool.query("SELECT COUNT(*)::int AS total_actions FROM actions WHERE tenant_id = $1", [tenantId]),
      pool.query("SELECT COALESCE(SUM(points), 0)::int AS total_points FROM users WHERE tenant_id = $1", [tenantId]),
      pool.query(
        `SELECT action_type, COUNT(*)::int AS action_count
         FROM actions
         WHERE tenant_id = $1
         GROUP BY action_type
         ORDER BY action_count DESC, action_type ASC
         LIMIT 5`,
        [tenantId]
      ),
      pool.query(
        `SELECT
            CASE
              WHEN points < 10 THEN '0-9'
              WHEN points < 25 THEN '10-24'
              WHEN points < 50 THEN '25-49'
              ELSE '50+'
            END AS bucket,
            COUNT(*)::int AS user_count
         FROM users
         WHERE tenant_id = $1
         GROUP BY bucket
         ORDER BY bucket`,
        [tenantId]
      ),
      pool.query(
        `SELECT activity_day, SUM(activity_count)::int AS activity_count
         FROM (
            SELECT DATE(created_at) AS activity_day, COUNT(*)::int AS activity_count
            FROM visits WHERE tenant_id = $1 GROUP BY DATE(created_at)
            UNION ALL
            SELECT DATE(created_at) AS activity_day, COUNT(*)::int AS activity_count
            FROM actions WHERE tenant_id = $1 GROUP BY DATE(created_at)
            UNION ALL
            SELECT DATE(created_at) AS activity_day, COUNT(*)::int AS activity_count
            FROM reviews WHERE tenant_id = $1 GROUP BY DATE(created_at)
            UNION ALL
            SELECT DATE(created_at) AS activity_day, COUNT(*)::int AS activity_count
            FROM referrals WHERE tenant_id = $1 GROUP BY DATE(created_at)
         ) a
         GROUP BY activity_day
         ORDER BY activity_day DESC
         LIMIT 14`,
        [tenantId]
      )
    ]);

    return res.json({
      tenant: req.tenant.slug,
      total_users: users.rows[0].total_users,
      total_visits: visits.rows[0].total_visits,
      total_actions: actions.rows[0].total_actions,
      total_points: points.rows[0].total_points,
      top_actions: topActions.rows,
      points_distribution: pointsDistribution.rows,
      daily_activity: dailyActivity.rows
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "dashboard failed" });
  }
});

app.get("/t/:slug/config", tenantMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT config, generated_from_session_id, updated_at FROM tenant_config WHERE tenant_id = $1",
      [req.tenant.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "config not found" });
    }

    return res.json({
      tenant: req.tenant.slug,
      ...result.rows[0]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "config retrieval failed" });
  }
});

app.post("/intake", async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, tenant_slug: tenantSlug, mode = "quick", answers = [] } = req.body;

    if (!email || !tenantSlug || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        error: "email, tenant_slug, and a non-empty answers array are required"
      });
    }

    logEvent("intake_start", { email, tenant_slug: tenantSlug, mode, answer_count: answers.length });

    await client.query("BEGIN");

    const tenant = await ensureTenant(tenantSlug);

    const sessionResult = await client.query(
      "INSERT INTO intake_sessions (tenant_id, email, mode) VALUES ($1, $2, $3) RETURNING *",
      [tenant.id, email, mode]
    );

    const session = sessionResult.rows[0];

    for (let i = 0; i < answers.length; i += 1) {
      await client.query(
        "INSERT INTO intake_responses (session_id, question_id, answer) VALUES ($1, $2, $3)",
        [session.id, i + 1, answers[i]]
      );
    }

    const roleScores = scoreAssessment(answers);
    const { primary, secondary } = getTopRoles(roleScores);
    const recommendations = generateRecommendations(primary, secondary, mode);

    logEvent("intake_result", {
      tenant_slug: tenant.slug,
      session_id: session.id,
      primary_role: primary,
      secondary_role: secondary
    });

    await client.query(
      `INSERT INTO intake_results (session_id, primary_role, secondary_role, role_scores, recommendations)
       VALUES ($1, $2, $3, $4, $5)`,
      [session.id, primary, secondary, roleScores, recommendations]
    );

    const config = generateTenantConfig(primary, secondary);
    await client.query(
      `INSERT INTO tenant_config (tenant_id, config, generated_from_session_id, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET config = EXCLUDED.config,
                     generated_from_session_id = EXCLUDED.generated_from_session_id,
                     updated_at = NOW()`,
      [tenant.id, config, session.id]
    );

    logEvent("config_generated", { tenant_slug: tenant.slug, config, source_session_id: session.id });

    await client.query("COMMIT");

    return res.json({
      success: true,
      session_id: session.id,
      tenant_slug: tenant.slug,
      primary_role: primary,
      secondary_role: secondary,
      scores: roleScores,
      recommendations,
      config
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "Intake failed" });
  } finally {
    client.release();
  }
});

app.get("/verify", async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const report = await runVerification(baseUrl);
    return res.json(report);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      phase1: "FAIL",
      phase2: "FAIL",
      phase3: "FAIL",
      system: "DEGRADED"
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Garvey server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database initialization failed", error);
    process.exit(1);
  });
