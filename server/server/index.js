const express = require("express");
const pool = require("./db");
const { getTenant } = require("./tenant");

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* =========================
   INIT DATABASE
========================= */
async function initDB() {
  await pool.query(`CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name TEXT,
    slug TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT,
    tenant_id INT,
    points INT DEFAULT 0,
    visit_count INT DEFAULT 0,
    last_visit TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS visits (
    id SERIAL PRIMARY KEY,
    user_id INT,
    tenant_id INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS actions (
    id SERIAL PRIMARY KEY,
    user_id INT,
    tenant_id INT,
    action_type TEXT,
    points INT,
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);

  await pool.query(`CREATE TABLE IF NOT EXISTS wishlist (
    id SERIAL PRIMARY KEY,
    user_id INT,
    tenant_id INT,
    product_name TEXT,
    category TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);
}
initDB();

/* =========================
   POINTS MAP
========================= */
const pointsMap = {
  visit: 5,
  review: 5,
  photo: 10,
  video: 20,
  referral: 25
};

/* =========================
   HELPER
========================= */
async function getOrCreateUser(email, tenantId) {
  let user = await pool.query(
    "SELECT * FROM users WHERE email=$1 AND tenant_id=$2",
    [email, tenantId]
  );

  if (user.rows.length === 0) {
    user = await pool.query(
      "INSERT INTO users (email, tenant_id) VALUES ($1, $2) RETURNING *",
      [email, tenantId]
    );
  }

  return user.rows[0];
}

/* =========================
   CHECK-IN
========================= */
app.post("/t/:slug/checkin", async (req, res) => {
  const { slug } = req.params;
  const { email } = req.body;

  const tenant = await getTenant(slug);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const user = await getOrCreateUser(email, tenant.id);

  const updated = await pool.query(
    "UPDATE users SET points = points + 5, visit_count = visit_count + 1, last_visit = NOW() WHERE id=$1 RETURNING *",
    [user.id]
  );

  await pool.query(
    "INSERT INTO visits (user_id, tenant_id) VALUES ($1, $2)",
    [user.id, tenant.id]
  );

  await pool.query(
    "INSERT INTO actions (user_id, tenant_id, action_type, points) VALUES ($1, $2, 'visit', 5)",
    [user.id, tenant.id]
  );

  res.json({ points: updated.rows[0].points });
});

/* =========================
   ACTION
========================= */
app.post("/t/:slug/action", async (req, res) => {
  const { slug } = req.params;
  const { email, action_type } = req.body;

  const tenant = await getTenant(slug);
  const user = await getOrCreateUser(email, tenant.id);

  const points = pointsMap[action_type] || 0;

  await pool.query(
    "UPDATE users SET points = points + $1 WHERE id=$2",
    [points, user.id]
  );

  await pool.query(
    "INSERT INTO actions (user_id, tenant_id, action_type, points) VALUES ($1, $2, $3, $4)",
    [user.id, tenant.id, action_type, points]
  );

  res.json({ points_added: points });
});

/* =========================
   WISHLIST
========================= */
app.post("/t/:slug/wishlist", async (req, res) => {
  const { slug } = req.params;
  const { email, product_name } = req.body;

  const tenant = await getTenant(slug);
  const user = await getOrCreateUser(email, tenant.id);

  await pool.query(
    "INSERT INTO wishlist (user_id, tenant_id, product_name) VALUES ($1, $2, $3)",
    [user.id, tenant.id, product_name]
  );

  res.json({ message: "Wishlist saved" });
});

/* =========================
   DASHBOARD
========================= */
app.get("/t/:slug/dashboard", async (req, res) => {
  const { slug } = req.params;
  const tenant = await getTenant(slug);

  const users = await pool.query(
    "SELECT COUNT(*) FROM users WHERE tenant_id=$1",
    [tenant.id]
  );

  const visits = await pool.query(
    "SELECT COUNT(*) FROM visits WHERE tenant_id=$1",
    [tenant.id]
  );

  const actions = await pool.query(
    "SELECT COUNT(*) FROM actions WHERE tenant_id=$1",
    [tenant.id]
  );

  res.json({
    users: users.rows[0].count,
    visits: visits.rows[0].count,
    actions: actions.rows[0].count
  });
});

/* =========================
   FUTURE HOOK (PHASE 2)
========================= */
app.post("/intake", async (req, res) => {
  res.json({ message: "BII Engine coming next phase" });
});

app.listen(process.env.PORT || 3000);
