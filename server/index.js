const express = require("express");
const path = require("path");
const { pool, initializeDatabase } = require("./db");
const { ensureTenant, getTenantBySlug, getTenantConfig, DEFAULT_TENANT_CONFIG } = require("./tenant");
const {
  scoreAssessment,
  getTopRoles,
  generateRecommendations,
  generateTenantConfig
} = require("./biiEngine");
const { runVerification } = require("./verify");
const { scoreVOCAnswers, generateVOCProfile, mergeVOCIntoConfig } = require("./vocEngine");
const { runAdaptiveCycle } = require("./adaptiveEngine");
const { scoreAnswers, getTopRoles: getTopRolesFromScores } = require("./scoringEngine");
const { seed } = require("./seedQuestions");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  return next();
});
app.use(express.static(path.join(__dirname, "..", "public")));

const ACTION_POINTS = {
  review: 5,
  photo: 10,
  video: 20,
  referral: 15
};

const ALLOWED_CONFIG_KEYS = [
  "reward_system",
  "engagement_engine",
  "email_marketing",
  "content_engine",
  "referral_system",
  "automation_blueprints",
  "analytics_engine"
];

function logEvent(event, payload = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...payload }));
}

function sanitizeConfig(config = {}) {
  const sanitized = {};

  for (const key of ALLOWED_CONFIG_KEYS) {
    if (typeof config[key] === "boolean") {
      sanitized[key] = config[key];
    }
  }

  return sanitized;
}

function rewardPointsEnabled(config) {
  return config.reward_system !== false;
}

async function findTenantUser(tenantId, email, client = pool) {
  const existing = await client.query(
    "SELECT * FROM users WHERE tenant_id = $1 AND email = $2",
    [tenantId, email]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const created = await client.query(
    `INSERT INTO users (tenant_id, email)
     VALUES ($1, $2)
     ON CONFLICT (tenant_id, email)
     DO UPDATE SET email = EXCLUDED.email
     RETURNING *`,
    [tenantId, email]
  );

  return created.rows[0];
}

async function tenantMiddleware(req, res, next) {
  const tenant = await getTenantBySlug(req.params.slug);

  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found", tenant_slug: req.params.slug });
  }

  req.tenant = tenant;
  req.tenantConfig = await getTenantConfig(tenant.id);
  return next();
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
    if (!email) return res.status(400).json({ error: "email is required" });

    const user = await findTenantUser(req.tenant.id, email);
    const pointsAdded = rewardPointsEnabled(req.tenantConfig) ? 5 : 0;

    await pool.query(
      "INSERT INTO visits (tenant_id, user_id, points_awarded) VALUES ($1, $2, $3)",
      [req.tenant.id, user.id, pointsAdded]
    );

    const updatedUser = await pool.query(
      "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id = $3 RETURNING points",
      [pointsAdded, req.tenant.id, user.id]
    );

    return res.json({
      success: true,
      tenant: req.tenant.slug,
      event: "checkin",
      points_added: pointsAdded,
      points: updatedUser.rows[0].points,
      message: pointsAdded > 0 ? `You earned ${pointsAdded} points!` : "Rewards are disabled for this tenant."
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

    const user = await findTenantUser(req.tenant.id, email);
    const pointsAdded = rewardPointsEnabled(req.tenantConfig) ? ACTION_POINTS[actionType] || 0 : 0;

    await pool.query(
      "INSERT INTO actions (tenant_id, user_id, action_type, points_awarded) VALUES ($1, $2, $3, $4)",
      [req.tenant.id, user.id, actionType, pointsAdded]
    );

    const updatedUser = await pool.query(
      "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id = $3 RETURNING points",
      [pointsAdded, req.tenant.id, user.id]
    );

    return res.json({
      success: true,
      tenant: req.tenant.slug,
      action_type: actionType,
      points_added: pointsAdded,
      points: updatedUser.rows[0].points,
      message: pointsAdded > 0 ? `You earned ${pointsAdded} points!` : "Action tracked. Rewards currently disabled."
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

    const user = await findTenantUser(req.tenant.id, email);
    const mediaBonus = mediaType === "video" ? 10 : mediaType === "photo" ? 5 : 0;
    const pointsAdded = rewardPointsEnabled(req.tenantConfig) ? 5 + mediaBonus : 0;

    const reviewResult = await pool.query(
      `INSERT INTO reviews (tenant_id, user_id, text, media_type, points_awarded)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.tenant.id, user.id, text, mediaType || null, pointsAdded]
    );

    const updatedUser = await pool.query(
      "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id = $3 RETURNING points",
      [pointsAdded, req.tenant.id, user.id]
    );

    return res.json({
      success: true,
      review: reviewResult.rows[0],
      points_added: pointsAdded,
      points: updatedUser.rows[0].points,
      message: pointsAdded > 0 ? `Thanks! You earned ${pointsAdded} points for your review.` : "Thanks! Review captured."
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

    const referrer = await findTenantUser(req.tenant.id, email, client);
    const referred = await findTenantUser(req.tenant.id, referredEmail, client);
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

    const users = await client.query(
      "SELECT email, points FROM users WHERE tenant_id = $1 AND id IN ($2, $3) ORDER BY email",
      [req.tenant.id, referrer.id, referred.id]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      points_awarded_each: pointsEach,
      users: users.rows,
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

    const user = await findTenantUser(req.tenant.id, email);
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
         FROM actions WHERE tenant_id = $1
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
            SELECT DATE(created_at) AS activity_day, COUNT(*)::int AS activity_count FROM visits WHERE tenant_id = $1 GROUP BY DATE(created_at)
            UNION ALL
            SELECT DATE(created_at) AS activity_day, COUNT(*)::int AS activity_count FROM actions WHERE tenant_id = $1 GROUP BY DATE(created_at)
            UNION ALL
            SELECT DATE(created_at) AS activity_day, COUNT(*)::int AS activity_count FROM reviews WHERE tenant_id = $1 GROUP BY DATE(created_at)
            UNION ALL
            SELECT DATE(created_at) AS activity_day, COUNT(*)::int AS activity_count FROM referrals WHERE tenant_id = $1 GROUP BY DATE(created_at)
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

    return res.json({ tenant: req.tenant.slug, ...result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "config retrieval failed" });
  }
});

app.get("/t/:slug/admin/config", tenantMiddleware, async (req, res) => {
  try {
    const configResult = await pool.query(
      `SELECT config, generated_from_session_id, updated_at
       FROM tenant_config
       WHERE tenant_id = $1`,
      [req.tenant.id]
    );

    if (!configResult.rows[0]) {
      return res.json({
        tenant: req.tenant.slug,
        config: DEFAULT_TENANT_CONFIG,
        primary_role: null,
        secondary_role: null,
        last_updated: null
      });
    }

    const joined = await pool.query(
      `SELECT ir.primary_role, ir.secondary_role
       FROM intake_results ir
       JOIN intake_sessions s ON s.id = ir.session_id
       WHERE ir.session_id = $1 AND s.tenant_id = $2`,
      [configResult.rows[0].generated_from_session_id, req.tenant.id]
    );

    return res.json({
      tenant: req.tenant.slug,
      config: { ...DEFAULT_TENANT_CONFIG, ...configResult.rows[0].config },
      primary_role: joined.rows[0]?.primary_role || null,
      secondary_role: joined.rows[0]?.secondary_role || null,
      last_updated: configResult.rows[0].updated_at
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "admin config retrieval failed" });
  }
});

app.post("/t/:slug/admin/config", tenantMiddleware, async (req, res) => {
  try {
    const incoming = sanitizeConfig(req.body?.config || {});

    const existing = await pool.query(
      "SELECT config FROM tenant_config WHERE tenant_id = $1",
      [req.tenant.id]
    );

    const merged = {
      ...DEFAULT_TENANT_CONFIG,
      ...(existing.rows[0]?.config || {}),
      ...incoming
    };

    await pool.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [req.tenant.id, merged]
    );

    return res.json({ success: true, tenant: req.tenant.slug, config: merged });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "admin config update failed" });
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


app.post("/voc-intake", async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, tenant_slug: tenantSlug, answers = [] } = req.body;

    if (!email || !tenantSlug || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "email, tenant_slug, and answers are required" });
    }

    const tenant = await ensureTenant(tenantSlug);

    await client.query("BEGIN");

    const sessionResult = await client.query(
      "INSERT INTO voc_sessions (tenant_id, email) VALUES ($1, $2) RETURNING *",
      [tenant.id, email]
    );

    const session = sessionResult.rows[0];

    for (let i = 0; i < answers.length; i += 1) {
      await client.query(
        "INSERT INTO voc_responses (session_id, question_id, answer) VALUES ($1, $2, $3)",
        [session.id, i + 1, answers[i]]
      );
    }

    const scores = scoreVOCAnswers(answers);
    const vocResult = generateVOCProfile(scores);

    await client.query(
      `INSERT INTO voc_results (session_id, customer_profile, engagement_style, buying_trigger, friction_point, loyalty_driver)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        session.id,
        vocResult.customer_profile,
        vocResult.engagement_style,
        vocResult.buying_trigger,
        vocResult.friction_point,
        vocResult.loyalty_driver
      ]
    );

    const existingConfigResult = await client.query(
      "SELECT config FROM tenant_config WHERE tenant_id = $1",
      [tenant.id]
    );

    const mergedConfig = mergeVOCIntoConfig(
      {
        ...DEFAULT_TENANT_CONFIG,
        ...(existingConfigResult.rows[0]?.config || {})
      },
      vocResult
    );

    await client.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET config = EXCLUDED.config,
                     updated_at = NOW()`,
      [tenant.id, mergedConfig]
    );

    await client.query("COMMIT");

    return res.json({
      customer_profile: vocResult.customer_profile,
      engagement_style: vocResult.engagement_style,
      buying_trigger: vocResult.buying_trigger,
      friction_point: vocResult.friction_point,
      loyalty_driver: vocResult.loyalty_driver
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "VOC intake failed" });
  } finally {
    client.release();
  }
});


app.get("/api/verify/db", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "DB_OK" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "DB_FAIL" });
  }
});

app.get("/api/verify/scoring", async (req, res) => {
  try {
    const questions = (await pool.query("SELECT * FROM questions ORDER BY id LIMIT 3")).rows;
    const answers = questions.map((q) => ({ qid: q.qid, answer: "A" }));
    const scores = scoreAnswers(answers, questions);
    const sample = getTopRolesFromScores(scores);

    return res.json({ status: "SCORING_OK", sample_result: sample });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "SCORING_FAIL" });
  }
});

app.get("/api/questions", async (req, res) => {
  try {
    const mode = String(req.query.mode || "25");
    const mappedType = mode === "60" ? "full" : "fast";
    const limit = mode === "60" ? 60 : 25;

    const result = await pool.query(
      `SELECT qid, question, options
       FROM questions
       ORDER BY id
       LIMIT $1`,
      [limit]
    );

    const questions = result.rows.map((q) => ({
      qid: q.qid,
      question: q.question,
      option_a: q.options?.A || "",
      option_b: q.options?.B || "",
      option_c: q.options?.C || "",
      option_d: q.options?.D || "",
      type: mappedType
    }));

    return res.json({ mode, count: questions.length, questions });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "questions fetch failed" });
  }
});

app.post("/api/intake", async (req, res) => {
  try {
    const { email, tenant, answers = [] } = req.body;

    if (!email || !tenant || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "email, tenant, answers are required" });
    }

    const tenantRow = await ensureTenant(tenant);
    const questionRows = (await pool.query("SELECT * FROM questions")).rows;

    for (const item of answers) {
      await pool.query(
        "INSERT INTO intake_responses (email, tenant, qid, answer) VALUES ($1, $2, $3, $4)",
        [email, tenant, item.qid, item.answer]
      );
    }

    const scores = scoreAnswers(answers, questionRows);
    const { primary_role, secondary_role } = getTopRolesFromScores(scores);

    await pool.query(
      "INSERT INTO results (email, tenant, primary_role, secondary_role, scores) VALUES ($1, $2, $3, $4, $5)",
      [email, tenant, primary_role, secondary_role, scores]
    );

    const rewardSystem = ["builder", "resource_generator"].includes(primary_role);
    const contentEngine = ["educator", "connector"].includes(primary_role);
    const referralSystem = ["connector", "nurturer"].includes(primary_role);
    const engagementEngine = ["connector", "educator", "nurturer"].includes(primary_role);
    const automationBlueprints = ["architect", "operator"].includes(primary_role);

    await pool.query(
      `INSERT INTO tenant_config (
        tenant_id, tenant, config, reward_system, email_marketing, referral_system,
        analytics_engine, engagement_engine, content_engine, automation_blueprints, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (tenant)
      DO UPDATE SET
        config = EXCLUDED.config,
        reward_system = EXCLUDED.reward_system,
        email_marketing = EXCLUDED.email_marketing,
        referral_system = EXCLUDED.referral_system,
        analytics_engine = EXCLUDED.analytics_engine,
        engagement_engine = EXCLUDED.engagement_engine,
        content_engine = EXCLUDED.content_engine,
        automation_blueprints = EXCLUDED.automation_blueprints,
        updated_at = NOW()`,
      [
        tenantRow.id,
        tenant,
        {
          reward_system: rewardSystem,
          email_marketing: false,
          referral_system: referralSystem,
          analytics_engine: false,
          engagement_engine: engagementEngine,
          content_engine: contentEngine,
          automation_blueprints: automationBlueprints
        },
        rewardSystem,
        false,
        referralSystem,
        false,
        engagementEngine,
        contentEngine,
        automationBlueprints
      ]
    );

    return res.json({ primary_role, secondary_role, scores });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "api intake failed" });
  }
});

app.get("/api/results/:email", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM results WHERE email = $1 ORDER BY created_at DESC LIMIT 1",
      [req.params.email]
    );

    if (!result.rows[0]) return res.status(404).json({ error: "result not found" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "results lookup failed" });
  }
});

app.post("/api/admin/config", async (req, res) => {
  try {
    const { tenant, config = {} } = req.body;
    if (!tenant) return res.status(400).json({ error: "tenant required" });

    const tenantRow = await ensureTenant(tenant);
    const existing = await pool.query("SELECT * FROM tenant_config WHERE tenant = $1", [tenant]);

    const merged = {
      reward_system: Boolean(config.reward_system ?? existing.rows[0]?.reward_system ?? false),
      email_marketing: Boolean(config.email_marketing ?? existing.rows[0]?.email_marketing ?? false),
      referral_system: Boolean(config.referral_system ?? existing.rows[0]?.referral_system ?? false),
      analytics_engine: Boolean(config.analytics_engine ?? existing.rows[0]?.analytics_engine ?? false),
      engagement_engine: Boolean(config.engagement_engine ?? existing.rows[0]?.engagement_engine ?? false),
      content_engine: Boolean(config.content_engine ?? existing.rows[0]?.content_engine ?? false),
      automation_blueprints: Boolean(config.automation_blueprints ?? existing.rows[0]?.automation_blueprints ?? false)
    };

    await pool.query(
      `INSERT INTO tenant_config (
        tenant_id, tenant, config, reward_system, email_marketing, referral_system,
        analytics_engine, engagement_engine, content_engine, automation_blueprints, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (tenant)
      DO UPDATE SET
        config = EXCLUDED.config,
        reward_system = EXCLUDED.reward_system,
        email_marketing = EXCLUDED.email_marketing,
        referral_system = EXCLUDED.referral_system,
        analytics_engine = EXCLUDED.analytics_engine,
        engagement_engine = EXCLUDED.engagement_engine,
        content_engine = EXCLUDED.content_engine,
        automation_blueprints = EXCLUDED.automation_blueprints,
        updated_at = NOW()`,
      [tenantRow.id, tenant, merged, merged.reward_system, merged.email_marketing, merged.referral_system, merged.analytics_engine, merged.engagement_engine, merged.content_engine, merged.automation_blueprints]
    );

    return res.json({ tenant, config: merged });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "api admin config update failed" });
  }
});

app.get("/api/admin/config/:tenant", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tenant, reward_system, email_marketing, referral_system,
              analytics_engine, engagement_engine, content_engine, automation_blueprints, updated_at
       FROM tenant_config WHERE tenant = $1`,
      [req.params.tenant]
    );

    if (!result.rows[0]) return res.status(404).json({ error: "tenant config not found" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "api admin config fetch failed" });
  }
});

app.get("/api/verify/questions", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*)::int AS count FROM questions");
    return res.json({ status: "QUESTIONS_OK", count: result.rows[0].count });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "QUESTIONS_FAIL" });
  }
});

app.get("/api/verify/intake", async (req, res) => {
  try {
    const questions = (await pool.query("SELECT qid FROM questions ORDER BY id LIMIT 5")).rows;
    const payload = {
      email: "verify-intake@garvey.test",
      tenant: "verify-intake-tenant",
      answers: questions.map((q, i) => ({ qid: q.qid, answer: ["A", "B", "C", "D"][i % 4] }))
    };

    const questionRows = (await pool.query("SELECT * FROM questions")).rows;
    for (const item of payload.answers) {
      await pool.query(
        "INSERT INTO intake_responses (email, tenant, qid, answer) VALUES ($1, $2, $3, $4)",
        [payload.email, payload.tenant, item.qid, item.answer]
      );
    }

    const scores = scoreAnswers(payload.answers, questionRows);
    const result = getTopRolesFromScores(scores);

    await pool.query(
      "INSERT INTO results (email, tenant, primary_role, secondary_role, scores) VALUES ($1, $2, $3, $4, $5)",
      [payload.email, payload.tenant, result.primary_role, result.secondary_role, scores]
    );

    return res.json({ status: "INTAKE_OK", result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "INTAKE_FAIL" });
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
      phase8: "FAIL",
      phase9: "FAIL",
      phase10: "FAIL",
      system: "DEGRADED"
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

initializeDatabase()
  .then(async () => {
    await seed(pool);

    const intervalMs = Number(process.env.ADAPTIVE_INTERVAL_MS || 300000);
    setInterval(async () => {
      try {
        const results = await runAdaptiveCycle();
        logEvent("adaptive_cycle", { tenant_count: results.length });
      } catch (error) {
        console.error("adaptive_cycle_failed", error);
      }
    }, intervalMs);

    app.listen(PORT, () => {
      console.log(`Garvey server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database initialization failed", error);
    process.exit(1);
  });
