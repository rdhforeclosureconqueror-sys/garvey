# Garvey System Report

## 1) System Purpose
Garvey is a multi-tenant behavior + intelligence platform that tracks customer behavior, issues rewards, collects business-intelligence intake responses, generates tenant-level configuration, and exposes analytics for business optimization.

---

## 2) Core Components
- **Behavior Engine:** tenant-scoped checkin/action/wishlist tracking.
- **Customer Experience Engine:** review capture, referral engine, QR join routing.
- **BII Engine:** intake session persistence, role scoring, recommendations.
- **Config Activation Layer:** tenant_config-driven feature gates.
- **Analytics Dashboard API:** aggregate counts, top actions, points distribution, daily activity.
- **Verification Engine:** system health and phase checks via `/verify`.

---

## 3) Data Flow Map
1. **User** starts via `/join/:slug` or `/intake.html`.
2. **Intake** (`POST /intake`) stores session + responses.
3. **Scoring** computes role profile.
4. **Config** is generated + saved in `tenant_config`.
5. **Behavior** endpoints use config gates for rewards/content/referrals.
6. **Dashboard** reads tenant analytics aggregates.

---

## 4) Endpoint Map
- `GET /health`
- `GET /verify`
- `GET /join/:slug`
- `POST /intake`
- `POST /t/:slug/checkin`
- `POST /t/:slug/action`
- `POST /t/:slug/review`
- `POST /t/:slug/referral`
- `POST /t/:slug/wishlist`
- `GET /t/:slug/dashboard`
- `GET /t/:slug/config`

---

## 5) File Map

### Backend
- `server/index.js` — API routes, feature gates, transactions, structured logging.
- `server/db.js` — PostgreSQL pool + schema bootstrap + indexes.
- `server/tenant.js` — tenant lookup/creation + tenant config resolution.
- `server/biiEngine.js` — intake scoring + recommendations + config generation.
- `server/verify.js` — automated verification checks.

### Frontend
- `public/index.html` — customer interaction UI (checkin/action/review/referral/wishlist).
- `public/intake.html` — intake UI (25/60 flow, progress, section guidance, submit).
- `public/dashboard.html` — tenant analytics display including upgraded metrics.

---

## 6) Phase Verification Report

### Phase 1 — Behavior Engine
- **Status:** PASS  
- Tenant-scoped events validated (`checkin`, `action`, `wishlist`)
- Points accumulation verified
- Dashboard reflects accurate counts

### Phase 2 — BII Engine
- **Status:** PASS  
- Intake sessions + responses persisted
- Role scoring and recommendations generated
- Results stored in `intake_results`

### Phase 3 — Auto Config Generation
- **Status:** PASS  
- Tenant config generated and persisted
- `/config` endpoint returns correct data

### Phase 3.5 — Hardening
- **Status:** PASS  
- Structured JSON logging implemented
- Transactional intake path (BEGIN/COMMIT/ROLLBACK)
- Tenant safety constraints enforced
- `/health` endpoint verified

### Phase 4 — Customer Experience Engine
- **Status:** PASS  
- `/join/:slug` routing functional
- Review + referral flows implemented
- Reward feedback messaging active

### Phase 5 — Analytics Upgrade
- **Status:** PASS  
- Top actions calculated
- Points distribution buckets added
- Daily activity tracking implemented

### Phase 6 — Config-Driven Activation
- **Status:** PASS  
- Feature gating enforced via `tenant_config`
- Disabled features return proper 403 responses

### Phase 7 — Verification Engine
- **Status:** PASS  
- `/verify` endpoint validates DB, endpoints, and system readiness

---

## 7) Deployment Readiness
- `npm start` boots server
- PostgreSQL schema auto-initializes
- Health + verification endpoints active
- Tenant-scoped APIs stable and consistent
- Ready for deployment (Render) with `DATABASE_URL`

---

## 8) Testing Summary
- End-to-end API flows validated via curl
- PostgreSQL setup + schema verified
- Tenant isolation confirmed
- Review/referral persistence confirmed
- Config gating behavior verified (403 cases)
- Dashboard analytics correctness validated