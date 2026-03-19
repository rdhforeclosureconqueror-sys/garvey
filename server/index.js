const express = require("express");
const path = require("path");
const { pool, initializeDatabase } = require("./db");
const { ensureTenant, getTenantBySlug } = require("./tenant");
const {
  scoreAssessment,
  getTopRoles,
  generateRecommendations,
  generateTenantConfig
} = require("./biiEngine");

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
  return next();
}

app.post("/t/:slug/checkin", tenantMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const user = await ensureTenantUser(req.tenant.id, email);

    await pool.query("INSERT INTO visits (tenant_id, user_id) VALUES ($1, $2)", [
      req.tenant.id,
      user.id
    ]);

    const updatedUser = await pool.query(
      "UPDATE users SET points = points + 5 WHERE id = $1 RETURNING id, email, points",
      [user.id]
    );

    return res.json({
      success: true,
      tenant: req.tenant.slug,
      event: "checkin",
      points_added: 5,
      points: updatedUser.rows[0].points
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

    const points = ACTION_POINTS[actionType] || 0;
    const user = await ensureTenantUser(req.tenant.id, email);

    await pool.query(
      "INSERT INTO actions (tenant_id, user_id, action_type, points_awarded) VALUES ($1, $2, $3, $4)",
      [req.tenant.id, user.id, actionType, points]
    );

    const updatedUser = await pool.query(
      "UPDATE users SET points = points + $1 WHERE id = $2 RETURNING id, email, points",
      [points, user.id]
    );

    return res.json({
      success: true,
      tenant: req.tenant.slug,
      action_type: actionType,
      points_added: points,
      points: updatedUser.rows[0].points
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "action failed" });
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

    const [users, visits, actions, points, topActions] = await Promise.all([
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
      )
    ]);

    return res.json({
      tenant: req.tenant.slug,
      total_users: users.rows[0].total_users,
      total_visits: visits.rows[0].total_visits,
      total_actions: actions.rows[0].total_actions,
      total_points: points.rows[0].total_points,
      top_actions: topActions.rows
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
