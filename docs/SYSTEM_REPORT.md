# Garvey Executive System Summary

## 1) System Purpose
Garvey is a multi-tenant behavior + intelligence platform that tracks customer behavior, issues rewards, collects business-intelligence intake responses, generates tenant-level configuration, and exposes analytics for business optimization.

## 2) Core Components
- **Behavior Engine:** tenant-scoped checkin/action/wishlist tracking.
- **Customer Experience Engine:** review capture, referral engine, QR join routing.
- **BII Engine:** intake session persistence, role scoring, recommendations.
- **Config Activation Layer:** tenant_config-driven feature gates.
- **Analytics Dashboard API:** aggregate counts, top actions, points distribution, daily activity.
- **Verification Engine:** system health and phase checks via `/verify`.

## 3) Data Flow Map
1. **User** starts via `/join/:slug` or `/intake.html`.
2. **Intake** (`POST /intake`) stores session + responses.
3. **Scoring** computes role profile.
4. **Config** is generated + saved in `tenant_config`.
5. **Behavior** endpoints use config gates for rewards/content/referrals.
6. **Dashboard** reads tenant analytics aggregates.

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

## 5) File Map
### Backend
- `server/index.js` — API routes, feature gates, transactions, structured logging.
- `server/db.js` — PostgreSQL pool + schema bootstrap + indexes.
- `server/tenant.js` — tenant lookup/creation + tenant config resolution.
- `server/biiEngine.js` — intake scoring + recommendations + config generation.
- `server/verify.js` — automated verification checks.

### Frontend
- `public/index.html` — customer interaction test surface (checkin/action/review/referral/wishlist).
- `public/intake.html` — intake UI (25/60 flow, progress, section guidance, submit).
- `public/dashboard.html` — tenant analytics display including upgraded metrics.

## 6) Verification Report by Phase
### Phase 1 — Behavior Engine
- **Status:** PASS
- **Issues found:** none blocking
- **Fixes applied:** tenant-safe queries and points handling validated.

### Phase 2 — BII Engine
- **Status:** PASS
- **Issues found:** none blocking
- **Fixes applied:** transactional write path + results persistence validated.

### Phase 3 — Auto Config Generation
- **Status:** PASS
- **Issues found:** none blocking
- **Fixes applied:** config upsert + retrieval validated.

### Phase 3.5 — Hardening
- **Status:** PASS
- **Issues found:** needed stronger observability and strict tenant safety coverage.
- **Fixes applied:** structured intake/config logs, transaction path retained, tenant-scoped query validation, `/health` active, unique tenant-user constraint retained.

### Phase 4 — Customer Experience Engine
- **Status:** PASS
- **Issues found:** customer-facing flows incomplete before hardening.
- **Fixes applied:** added `/join/:slug`, reviews table + endpoint, referral endpoint, reward feedback messaging.

### Phase 5 — Analytics Upgrade
- **Status:** PASS
- **Issues found:** missing deeper metrics.
- **Fixes applied:** added top actions, points distribution buckets, daily activity counts.

### Phase 6 — Config-Driven Activation
- **Status:** PASS
- **Issues found:** behavior previously not gated by config.
- **Fixes applied:** reward/content/referral feature gating via tenant_config.

### Phase 7 — Verification Engine
- **Status:** PASS
- **Issues found:** no formal system verification endpoint.
- **Fixes applied:** added `server/verify.js` and `GET /verify` status response.

## 7) Deployment Readiness (Render)
- Server starts with `npm start`.
- PostgreSQL schema self-initializes at boot.
- Health + verification endpoints available.
- Tenant-scoped APIs return JSON consistently.
- System is deployment-ready for Render with `DATABASE_URL` configured.
