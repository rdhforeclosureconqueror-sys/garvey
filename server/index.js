/* FILE: server/index.js
   NEW-ONLY SOURCE OF TRUTH (cohesive, no legacy pipeline)

   ✅ Platform behavior endpoints under /t/:slug/*
   ✅ API endpoints under /api/*
   ✅ Intake questions contract:
      GET /api/questions?mode=25|60 -> { mode,type,count,questions[] }
      POST /api/intake -> { email, tenant, answers:[{qid,answer}] }
   ✅ Startup order:
      await initializeDatabase()
      await seed(pool)
      start server
      start adaptive cycle
*/

"use strict";

const express = require("express");
const path = require("path");
const { generateTenantSite } = require("./siteGenerator");
const { pool, initializeDatabase } = require("./db");
const { ensureTenant, getTenantBySlug, getTenantConfig, DEFAULT_TENANT_CONFIG } = require("./tenant");
const { runAdaptiveCycle } = require("./adaptiveEngine");
const { scoreAnswers, getTopRoles } = require("./scoringEngine");
const { seed } = require("./seedQuestions");
const { scoreVOCAnswers, generateVOCProfile, mergeVOCIntoConfig } = require("./vocEngine");

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
  "analytics_engine",
  "reward_multiplier",
  "review_incentive_bonus",
  "system_adjustments_log"
];

function logEvent(event, payload = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...payload }));
}

function sanitizeConfig(config = {}) {
  const sanitized = {};
  for (const key of ALLOWED_CONFIG_KEYS) {
    if (typeof config[key] === "boolean") sanitized[key] = config[key];
    if (typeof config[key] === "number") sanitized[key] = config[key];
    if (Array.isArray(config[key]) || (config[key] && typeof config[key] === "object")) {
      if (key === "system_adjustments_log") sanitized[key] = config[key];
    }
  }
  return sanitized;
}

function rewardPointsEnabled(config) {
  return config?.reward_system !== false;
}

async function findTenantUser(tenantId, email, client = pool) {
  const existing = await client.query(
    "SELECT * FROM users WHERE tenant_id = $1 AND email = $2",
    [tenantId, email]
  );
  if (existing.rows[0]) return existing.rows[0];

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
  try {
    const { slug } = req.params;
    const tenant = await getTenantBySlug(slug);

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found", tenant_slug: slug });
    }

    req.tenant = tenant;
    req.tenantConfig = (await getTenantConfig(tenant.id)) || {};
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "tenant middleware failed" });
  }
}

/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => res.json({ status: "ok" }));

/* =========================
   PLATFORM ROUTES (behavior engine)
========================= */

app.get("/join/:slug", async (req, res) => {
  const tenant = await getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });
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
    if (!email || !actionType) return res.status(400).json({ error: "email and action_type are required" });

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
      points: updatedUser.rows[0].points
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "action failed" });
  }
});

app.post("/t/:slug/review", tenantMiddleware, async (req, res) => {
  try {
    const { email, text, media_type: mediaType } = req.body;
    if (!email || !text) return res.status(400).json({ error: "email and text are required" });

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
      tenant: req.tenant.slug,
      review: reviewResult.rows[0],
      points_added: pointsAdded,
      points: updatedUser.rows[0].points
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "review failed" });
  }
});

app.post("/t/:slug/referral", tenantMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, referred_email: referredEmail } = req.body;
    if (!email || !referredEmail) return res.status(400).json({ error: "email and referred_email are required" });

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
      tenant: req.tenant.slug,
      points_awarded_each: pointsEach,
      users: users.rows
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
    if (!email || !productName) return res.status(400).json({ error: "email and product_name are required" });

    const user = await findTenantUser(req.tenant.id, email);
    const result = await pool.query(
      "INSERT INTO wishlist (tenant_id, user_id, product_name) VALUES ($1, $2, $3) RETURNING *",
      [req.tenant.id, user.id, productName]
    );

    return res.json({ success: true, tenant: req.tenant.slug, wishlist_entry: result.rows[0] });
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

/* =========================
   ADMIN CONFIG API
========================= */

app.get("/api/admin/config/:tenant", async (req, res) => {
  try {
    const tenant = await getTenantBySlug(req.params.tenant);
    if (!tenant) return res.status(404).json({ error: "tenant not found" });

    const result = await pool.query("SELECT config, updated_at FROM tenant_config WHERE tenant_id = $1", [tenant.id]);
    const row = result.rows[0];

    if (!row) {
      return res.json({ tenant: tenant.slug, config: DEFAULT_TENANT_CONFIG, updated_at: null });
    }

    return res.json({ tenant: tenant.slug, config: { ...DEFAULT_TENANT_CONFIG, ...(row.config || {}) }, updated_at: row.updated_at });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "api admin config fetch failed" });
  }
});

app.post("/api/admin/config", async (req, res) => {
  try {
    const { tenant, config = {} } = req.body;
    if (!tenant) return res.status(400).json({ error: "tenant required" });

    const tenantRow = await ensureTenant(tenant);
    const merged = { ...DEFAULT_TENANT_CONFIG, ...sanitizeConfig(config) };

    await pool.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenantRow.id, merged]
    );

    return res.json({ tenant: tenantRow.slug, config: merged });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "api admin config update failed" });
  }
});

/* =========================
   QUESTIONS API
========================= */

// Adaptive next-question picker
app.post("/api/questions/next", async (req, res) => {
  try {
    const mode = String(req.body?.mode || "25");
    if (!["25", "60"].includes(mode)) {
      return res.status(400).json({ error: "mode must be 25 or 60" });
    }

    const type = mode === "60" ? "full" : "fast";
    const limit = mode === "60" ? 60 : 25;

    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const answeredQids = new Set(answers.map((a) => a?.qid).filter(Boolean));

    // Pull the whole bank for this mode
    const bank = (
      await pool.query(
        `SELECT qid, question, options, weights, type
         FROM questions
         WHERE type = $1
         ORDER BY id ASC
         LIMIT $2`,
        [type, limit]
      )
    ).rows;

    // If no bank loaded, fail clearly
    if (!bank.length) return res.status(500).json({ error: "question bank empty (seed?)" });

    // If finished
    if (answeredQids.size >= bank.length) {
      return res.json({ done: true, question: null });
    }

    // Score current progress using your scoringEngine
    const scores = scoreAnswers(answers, bank);
    const top = getTopRoles(scores);
    const primary = top.primary_role;
    const secondary = top.secondary_role;

    // Choose candidate question that best separates primary vs secondary.
    // Heuristic: for each remaining question, compute max |wA[p]-wA[s]| across options,
    // pick the question with highest separation.
    let best = null;
    let bestScore = -1;

    for (const q of bank) {
      if (!q?.qid || answeredQids.has(q.qid)) continue;

      const w = q.weights || {};
      const opts = ["A", "B", "C", "D"];

      let sep = 0;
      for (const o of opts) {
        const rw = (w && w[o]) || {};
        const p = Number(rw?.[primary] || 0);
        const s = Number(rw?.[secondary] || 0);
        sep = Math.max(sep, Math.abs(p - s));
      }

      if (sep > bestScore) {
        bestScore = sep;
        best = q;
      }
    }

    // Fallback: first unanswered
    if (!best) {
      best = bank.find((q) => q?.qid && !answeredQids.has(q.qid));
    }

    // Return in frontend flat shape
    return res.json({
      done: false,
      question: {
        qid: best.qid,
        question: best.question,
        option_a: best.options?.A || "",
        option_b: best.options?.B || "",
        option_c: best.options?.C || "",
        option_d: best.options?.D || "",
        type: best.type
      }
    });
  } catch (error) {
    console.error("questions_next_failed", error);
    return res.status(500).json({ error: "questions next failed" });
  }
});
/* =========================
   INTAKE API
========================= */

app.post("/api/intake", async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, tenant, answers = [] } = req.body;

    if (!email || !tenant || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "email, tenant, answers are required" });
    }
    if (!answers.every((a) => a && a.qid && a.answer)) {
      return res.status(400).json({ error: "Invalid answer format (qid + answer required)" });
    }

    await client.query("BEGIN");

    const tenantRow = await ensureTenant(tenant);
    const mode = answers.length > 25 ? "full" : "fast";

    const session = (
      await client.query(
        `INSERT INTO intake_sessions (tenant_id, email, mode)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [tenantRow.id, email, mode]
      )
    ).rows[0];

    for (const item of answers) {
      await client.query(
        `INSERT INTO intake_responses (session_id, question_id, answer)
         VALUES ($1, $2, $3)`,
        [session.id, item.qid, item.answer]
      );
    }

    const qids = answers.map((a) => a.qid);
    const questionRows = (await client.query("SELECT * FROM questions WHERE qid = ANY($1)", [qids])).rows;
    if (!questionRows.length) throw new Error("No matching questions found for scoring");

    const scores = scoreAnswers(answers, questionRows);
    const { primary_role, secondary_role } = getTopRoles(scores);

    await client.query(
      `INSERT INTO results (session_id, primary_role, secondary_role, scores)
       VALUES ($1, $2, $3, $4)`,
      [session.id, primary_role, secondary_role, scores]
    );

    const config = {
      reward_system: ["builder", "resource_generator"].includes(primary_role),
      email_marketing: false,
      referral_system: ["connector", "nurturer"].includes(primary_role),
      analytics_engine: primary_role === "operator",
      engagement_engine: ["connector", "educator", "nurturer"].includes(primary_role),
      content_engine: ["educator", "connector"].includes(primary_role),
      automation_blueprints: ["architect", "operator"].includes(primary_role)
    };

    await client.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenantRow.id, config]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      session_id: session.id,
      primary_role,
      secondary_role,
      scores,
      config
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("api_intake_failed", error);
    return res.status(500).json({ error: "api intake failed", details: error.message });
  } finally {
    client.release();
  }
});

/* =========================
   RESULTS API
========================= */

app.get("/api/results/:email", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*
       FROM results r
       JOIN intake_sessions s ON s.id = r.session_id
       WHERE s.email = $1
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 1`,
      [req.params.email]
    );

    if (!result.rows[0]) return res.status(404).json({ error: "result not found" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "results lookup failed" });
  }
});

/* =========================
   VOC INTAKE
========================= */

app.post("/voc-intake", async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, tenant_slug: tenantSlug, answers = [] } = req.body;
    if (!email || !tenantSlug || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "email, tenant_slug, and answers are required" });
    }

    const tenant = await ensureTenant(tenantSlug);

    await client.query("BEGIN");

    const session = (
      await client.query(
        "INSERT INTO voc_sessions (tenant_id, email) VALUES ($1, $2) RETURNING *",
        [tenant.id, email]
      )
    ).rows[0];

    for (let i = 0; i < answers.length; i += 1) {
      await client.query(
        "INSERT INTO voc_responses (session_id, question_id, answer) VALUES ($1, $2, $3)",
        [session.id, i + 1, answers[i]]
      );
    }

    const scores = scoreVOCAnswers(answers);
    const vocResult = generateVOCProfile(scores);

    await client.query(
      `INSERT INTO voc_results (
        session_id, customer_profile, engagement_style, buying_trigger, friction_point, loyalty_driver
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        session.id,
        vocResult.customer_profile,
        vocResult.engagement_style,
        vocResult.buying_trigger,
        vocResult.friction_point,
        vocResult.loyalty_driver
      ]
    );

    const existingConfig = await client.query("SELECT config FROM tenant_config WHERE tenant_id = $1", [tenant.id]);
    const mergedConfig = mergeVOCIntoConfig(
      { ...DEFAULT_TENANT_CONFIG, ...(existingConfig.rows[0]?.config || {}) },
      vocResult
    );

    await client.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenant.id, mergedConfig]
    );

    await client.query("COMMIT");
    return res.json(vocResult);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "VOC intake failed", details: error.message });
  } finally {
    client.release();
  }
});

/* =========================
   VERIFY
========================= */

app.get("/api/verify/db", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "DB_OK" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "DB_FAIL" });
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

app.get("/api/verify/scoring", async (req, res) => {
  try {
    const qs = (await pool.query("SELECT * FROM questions ORDER BY id ASC LIMIT 3")).rows;
    const answers = qs.map((q) => ({ qid: q.qid, answer: "A" }));
    const scores = scoreAnswers(answers, qs);
    const top = getTopRoles(scores);
    return res.json({ status: "SCORING_OK", sample: top });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "SCORING_FAIL" });
  }
});

/* =========================
   SERVER STARTUP
========================= */

(async () => {
  try {
    await initializeDatabase();
    await seed(pool);

    const intervalMs = Number(process.env.ADAPTIVE_INTERVAL_MS || 300000);
    setInterval(async () => {
      try {
        const results = await runAdaptiveCycle();
        logEvent("adaptive_cycle", { tenant_count: Array.isArray(results) ? results.length : null });
      } catch (error) {
        console.error("adaptive_cycle_failed", error);
      }
    }, intervalMs);

    app.listen(PORT, () => console.log(`Garvey server listening on port ${PORT}`));
  } catch (error) {
    console.error("Database initialization failed", error);
    process.exit(1);
  }
})();
