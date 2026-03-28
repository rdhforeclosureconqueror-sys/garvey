# Customer Return Engine

## What this engine is
The **Customer Return Engine** is the single orchestration layer for rewards/earn flows in the GARVEY frontend. It unifies:
- CTA entry into rewards flow
- tenant/customer context propagation (`tenant`, `email`, `cid`, `rid/crid`, owner fields)
- rewards API calls (`checkin`, `action`, `review`, `referral`, `wishlist`)
- status + history loading and local persistence

Location: `public/engine/customer-return-engine.js`.

## Public API
The engine exposes the following methods from an instance:

- `init(ctx)`
  - Seeds context/state from URL + stored state.
- `startEarnFlow(ctx?)`
  - Starts customer earn flow by routing to `/rewards.html` with normalized context.
- `awardReward(event)`
  - Awards a reward event via backend API.
  - Supported `event.type`: `checkin`, `action`, `review`, `referral`, `wishlist`.
- `getStatus(ctx?)`
  - Loads `/api/rewards/status` and updates current state.
- `getLedger(ctx?)`
  - Loads `/api/rewards/history` and stores ledger snapshot.
- `persist()`
  - Persists engine state to localStorage.

Convenience:
- `buildRewardsUrl(ctx?)`
- `getState()`

## End-to-end flow
1. User clicks any rewards/return CTA (homepage, premium shell, customer results).
2. CTA uses engine `startEarnFlow()` rather than hand-rolled URL logic.
3. Rewards page initializes engine with page/ctx and calls `getStatus()`.
4. Reward actions call `awardReward(event)`.
5. Engine refreshes status, updates ledger, and persists state.
6. Related pages can reuse persisted ctx and flow consistently.

## Local verification
1. Install deps (if needed): `npm install`
2. Run server: `npm start`
3. Open:
   - `/index.html?tenant=test-business&email=test@example.com&cid=demo-campaign`
4. Click a return/rewards CTA.
5. In `/rewards.html`:
   - Click `+ Check-in`
   - Confirm status pane updates
   - Trigger one more action (review/referral/wishlist)
6. Confirm context continuity:
   - URL includes `tenant/email/cid/crid` where applicable
   - Dashboard/back links keep tenant/campaign context
7. Optional scripted checks:
   - `node scripts/contract-check.mjs`

