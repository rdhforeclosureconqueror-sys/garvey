// FILE: public/engine/customer-return-engine.js
(function initCustomerReturnEngine(global) {
  "use strict";

  const STORAGE_KEY = "garvey_customer_return_engine_v1";

  function safeTrim(value) {
    return String(value ?? "").trim();
  }

  function normalizeCtx(input) {
    const src = input || {};
    return {
      tenant: safeTrim(src.tenant),
      email: safeTrim(src.email).toLowerCase(),
      name: safeTrim(src.name),
      cid: safeTrim(src.cid),
      rid: safeTrim(src.rid || src.crid),
      owner_email: safeTrim(src.owner_email).toLowerCase(),
      owner_rid: safeTrim(src.owner_rid),
    };
  }

  function mergeCtx(base, next) {
    const b = normalizeCtx(base);
    const n = normalizeCtx(next);
    return {
      tenant: n.tenant || b.tenant,
      email: n.email || b.email,
      name: n.name || b.name,
      cid: n.cid || b.cid,
      rid: n.rid || b.rid,
      owner_email: n.owner_email || b.owner_email,
      owner_rid: n.owner_rid || b.owner_rid,
    };
  }

  function readJson(storage, key, fallback) {
    if (!storage) return fallback;
    try {
      const raw = storage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function createEngine(options) {
    const opts = options || {};
    const fetchImpl = opts.fetchImpl || global.fetch?.bind(global);
    const locationLike = opts.location || global.location;
    const storage = opts.storage || global.localStorage;
    const traceLogger = typeof opts.traceLogger === "function" ? opts.traceLogger : null;
    const buildUrl = opts.buildUrl || ((path, query = null) => {
      if (!query || Object.keys(query).length === 0) return path;
      const params = new URLSearchParams(query);
      return `${path}?${params.toString()}`;
    });

    const state = {
      ctx: normalizeCtx(opts.initialCtx),
      status: null,
      ledger: [],
      lastEvent: null,
      initializedAt: null,
      persistedAt: null,
    };

    function loadPersisted() {
      const payload = readJson(storage, STORAGE_KEY, null);
      if (!payload) return;
      if (payload.ctx) state.ctx = mergeCtx(state.ctx, payload.ctx);
      if (Array.isArray(payload.ledger)) state.ledger = payload.ledger;
      if (payload.status && typeof payload.status === "object") state.status = payload.status;
      if (payload.lastEvent && typeof payload.lastEvent === "object") state.lastEvent = payload.lastEvent;
      if (payload.persistedAt) state.persistedAt = payload.persistedAt;
    }

    function persist() {
      if (!storage) return null;
      const payload = {
        ctx: state.ctx,
        status: state.status,
        ledger: state.ledger,
        lastEvent: state.lastEvent,
        persistedAt: nowIso(),
      };
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(payload));
        state.persistedAt = payload.persistedAt;
      } catch (_) {}
      return payload;
    }

    async function requestJson(path, init) {
      if (!fetchImpl) throw new Error("fetch is not available");
      const mergedInit = Object.assign({}, init || {});
      const headers = Object.assign({}, mergedInit.headers || {});
      if (state.ctx.email) headers["x-user-email"] = state.ctx.email;
      if (state.ctx.tenant) headers["x-tenant-slug"] = state.ctx.tenant;
      headers["x-user-role"] = "customer";
      mergedInit.headers = headers;
      const res = await fetchImpl(buildUrl(path), mergedInit);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || body.message || `Request failed (${res.status})`);
      }
      return body;
    }

    function eventToRequest(eventInput) {
      const event = eventInput || {};
      const type = safeTrim(event.type).toLowerCase();
      const payload = {
        tenant: state.ctx.tenant,
        email: state.ctx.email,
        name: state.ctx.name || undefined,
        cid: state.ctx.cid || undefined,
        result_id: state.ctx.rid || undefined,
      };

      if (type === "checkin") return { path: "/api/rewards/checkin", payload };
      if (type === "action") return {
        path: "/api/rewards/action",
        payload: Object.assign(payload, { action_type: safeTrim(event.action_type || "review") || "review" }),
      };
      if (type === "review") return {
        path: "/api/rewards/review",
        payload: Object.assign(payload, {
          text: safeTrim(event.text),
          media_type: safeTrim(event.media_type) || undefined,
          media_note: safeTrim(event.media_note) || undefined,
          media_url: safeTrim(event.media_url) || undefined,
          media_photo_url: safeTrim(event.media_photo_url) || undefined,
          media_video_url: safeTrim(event.media_video_url) || undefined,
          rating: event.rating == null || safeTrim(event.rating) === "" ? undefined : Number(event.rating),
          product_id: event.product_id == null || safeTrim(event.product_id) === "" ? undefined : Number(event.product_id),
        }),
      };
      if (type === "contribution") return {
        path: "/api/contributions/contribute",
        payload: Object.assign(payload, {
          amount: event.amount == null || safeTrim(event.amount) === "" ? undefined : Number(event.amount),
          note: safeTrim(event.note) || undefined,
        }),
      };
      if (type === "referral") return {
        path: "/api/rewards/referral",
        payload: Object.assign(payload, { referred_email: safeTrim(event.referred_email) }),
      };
      if (type === "wishlist") return {
        path: "/api/rewards/wishlist",
        payload: Object.assign(payload, { product_name: safeTrim(event.product_name) }),
      };
      throw new Error(`Unsupported reward event type: ${type || "(empty)"}`);
    }

    function syncCtxFromPayload(payload) {
      if (!payload || typeof payload !== "object") return;
      state.ctx = mergeCtx(state.ctx, {
        tenant: payload.tenant,
        email: payload.email || payload.user?.email,
        name: payload.name || payload.user?.name,
        cid: payload.cid,
        rid: payload.crid || payload.result_id,
      });
      if (global.GARVEY && typeof global.GARVEY.setLoginCtx === "function") {
        global.GARVEY.setLoginCtx({
          tenant: state.ctx.tenant,
          email: state.ctx.email,
          name: state.ctx.name,
          cid: state.ctx.cid,
          rid: state.ctx.rid,
        });
      }
    }

    async function getStatus(nextCtx) {
      state.ctx = mergeCtx(state.ctx, nextCtx);
      if (!state.ctx.tenant) throw new Error("tenant is required");
      const query = { tenant: state.ctx.tenant };
      if (state.ctx.email) query.email = state.ctx.email;
      if (state.ctx.name) query.name = state.ctx.name;
      if (state.ctx.cid) query.cid = state.ctx.cid;
      if (state.ctx.rid) query.crid = state.ctx.rid;
      const payload = await requestJson(`/api/rewards/status?${new URLSearchParams(query).toString()}`);
      state.status = payload;
      syncCtxFromPayload(payload);
      persist();
      return payload;
    }

    async function getLedger(nextCtx) {
      state.ctx = mergeCtx(state.ctx, nextCtx);
      if (!state.ctx.tenant) throw new Error("tenant is required");
      const query = { tenant: state.ctx.tenant };
      if (state.ctx.email) query.email = state.ctx.email;
      const payload = await requestJson(`/api/rewards/history?${new URLSearchParams(query).toString()}`);
      state.ledger = Array.isArray(payload.history) ? payload.history : [];
      persist();
      return state.ledger;
    }

    async function awardReward(eventInput) {
      const request = eventToRequest(eventInput);
      if (traceLogger) {
        traceLogger({
          phase: "awardReward.request",
          path: request.path,
          payload: Object.assign({}, request.payload),
          event_type: safeTrim(eventInput?.type).toLowerCase(),
        });
      }
      if (!safeTrim(request.payload.tenant) || !safeTrim(request.payload.email)) {
        throw new Error("tenant and email are required");
      }
      if (request.path.endsWith("/review") && !safeTrim(request.payload.text)) {
        throw new Error("review text is required");
      }
      if (request.path.endsWith("/referral") && !safeTrim(request.payload.referred_email)) {
        throw new Error("referred_email is required");
      }
      if (request.path.endsWith("/wishlist") && !safeTrim(request.payload.product_name)) {
        throw new Error("product_name is required");
      }
      if (request.path.endsWith("/contribute") && (!(Number.isFinite(Number(request.payload.amount))) || Number(request.payload.amount) <= 0)) {
        throw new Error("amount must be a positive number");
      }

      const payload = await requestJson(request.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.payload),
      });
      if (traceLogger) {
        traceLogger({
          phase: "awardReward.response",
          path: request.path,
          payload,
        });
      }

      const entry = {
        type: safeTrim(eventInput?.type).toLowerCase(),
        created_at: nowIso(),
        request: request.payload,
        response: payload,
      };
      state.lastEvent = entry;
      state.ledger = [entry, ...state.ledger].slice(0, 200);
      syncCtxFromPayload(payload);
      await getStatus();
      persist();
      return payload;
    }

    function buildRewardsUrl(nextCtx) {
      const merged = mergeCtx(state.ctx, nextCtx);
      const query = new URLSearchParams();
      if (merged.tenant) query.set("tenant", merged.tenant);
      if (merged.email) query.set("email", merged.email);
      if (merged.name) query.set("name", merged.name);
      if (merged.cid) query.set("cid", merged.cid);
      if (merged.rid) query.set("crid", merged.rid);
      if (merged.owner_email) query.set("owner_email", merged.owner_email);
      if (merged.owner_rid) query.set("owner_rid", merged.owner_rid);
      const suffix = query.toString();
      return `/rewards.html${suffix ? `?${suffix}` : ""}`;
    }

    function startEarnFlow(nextCtx) {
      state.ctx = mergeCtx(state.ctx, nextCtx);
      persist();
      const url = buildRewardsUrl(state.ctx);
      if (locationLike && typeof locationLike.assign === "function") {
        locationLike.assign(url);
      }
      return url;
    }

    function getStateSnapshot() {
      return {
        initializedAt: state.initializedAt,
        persistedAt: state.persistedAt,
        ctx: Object.assign({}, state.ctx),
        status: state.status,
        lastEvent: state.lastEvent,
        ledgerSize: state.ledger.length,
      };
    }

    function init(nextCtx) {
      loadPersisted();
      state.ctx = mergeCtx(state.ctx, nextCtx);
      state.initializedAt = state.initializedAt || nowIso();
      persist();
      return getStateSnapshot();
    }

    loadPersisted();

    return {
      init,
      startEarnFlow,
      awardReward,
      getStatus,
      getLedger,
      persist,
      buildRewardsUrl,
      getState: getStateSnapshot,
    };
  }

  const api = {
    createEngine,
    createDefaultEngine() {
      const buildUrl = global.GarveyApi?.buildUrl ? global.GarveyApi.buildUrl : undefined;
      return createEngine({ buildUrl, initialCtx: global.GARVEY?.ctx ? global.GARVEY.ctx() : undefined });
    },
    normalizeCtx,
    mergeCtx,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.CustomerReturnEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
