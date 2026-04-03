"use strict";

const ROLES = Object.freeze({
  ADMIN: "admin",
  BUSINESS_OWNER: "business_owner",
  STAFF_OPERATOR: "staff_operator",
  CUSTOMER: "customer",
  ANONYMOUS: "anonymous",
});

const ACTIONS = Object.freeze({
  DASHBOARD_READ: "dashboard:read",
  CAMPAIGN_CREATE: "campaign:create",
  CAMPAIGN_READ: "campaign:read",
  QR_GENERATE: "qr:generate",
  PRODUCTS_MANAGE: "products:manage",
  GARVEY_READ: "garvey:read",
  GARVEY_UPDATE: "garvey:update",
  RESULTS_READ_OWNER: "results:read_owner",
  RESULTS_READ_CUSTOMER: "results:read_customer",
  REWARDS_READ: "rewards:read",
  REWARDS_UPDATE_SELF: "rewards:update_self",
  VOC_CREATE: "voc:create",
  TENANT_ADMIN: "tenant:admin",
});

const POLICY_BY_ROLE = Object.freeze({
  [ROLES.ADMIN]: { actions: ["*"], resource_scope: "global" },
  [ROLES.BUSINESS_OWNER]: {
    actions: [
      ACTIONS.DASHBOARD_READ,
      ACTIONS.CAMPAIGN_CREATE,
      ACTIONS.CAMPAIGN_READ,
      ACTIONS.QR_GENERATE,
      ACTIONS.PRODUCTS_MANAGE,
      ACTIONS.GARVEY_READ,
      ACTIONS.GARVEY_UPDATE,
      ACTIONS.RESULTS_READ_OWNER,
      ACTIONS.RESULTS_READ_CUSTOMER,
    ],
    resource_scope: "tenant_only",
  },
  [ROLES.STAFF_OPERATOR]: {
    actions: [
      ACTIONS.DASHBOARD_READ,
      ACTIONS.CAMPAIGN_READ,
      ACTIONS.GARVEY_READ,
      ACTIONS.GARVEY_UPDATE,
    ],
    resource_scope: "tenant_only",
  },
  [ROLES.CUSTOMER]: {
    actions: [
      ACTIONS.REWARDS_READ,
      ACTIONS.REWARDS_UPDATE_SELF,
      ACTIONS.VOC_CREATE,
      ACTIONS.RESULTS_READ_CUSTOMER,
    ],
    resource_scope: "self_and_tenant_safe_only",
  },
  [ROLES.ANONYMOUS]: { actions: [], resource_scope: "public_only" },
});

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRole(value) {
  const input = String(value || "").trim().toLowerCase();
  if (!input) return ROLES.ANONYMOUS;
  if (Object.values(ROLES).includes(input)) return input;
  if (input === "staff" || input === "operator") return ROLES.STAFF_OPERATOR;
  if (input === "owner") return ROLES.BUSINESS_OWNER;
  return ROLES.ANONYMOUS;
}

function deriveActor(req) {
  const sessionActor = req.authActor || null;
  const role = normalizeRole(sessionActor?.role || req.query.role || req.headers["x-user-role"]);
  const email = normalizeEmail(sessionActor?.email || req.userEmail || req.query.email || req.headers["x-user-email"]);
  const tenantSlug = String(
    sessionActor?.tenantSlug || req.query.tenant || req.body?.tenant || req.params.slug || req.headers["x-tenant-slug"] || ""
  )
    .trim()
    .toLowerCase();

  return {
    email,
    role,
    tenantSlug,
    isAdmin: role === ROLES.ADMIN || sessionActor?.isAdmin === true || req.isAdmin === true,
    userId: String(sessionActor?.userId || req.query.user_id || req.body?.user_id || req.headers["x-user-id"] || "").trim() || null,
    onboardingComplete: !!sessionActor?.onboardingComplete,
  };
}

function evaluatePolicy({ actor, action, resourceTenantSlug }) {
  if (!actor) return { allow: false, reason: "missing actor" };
  if (actor.isAdmin) return { allow: true, reason: "admin global override" };

  const policy = POLICY_BY_ROLE[actor.role] || POLICY_BY_ROLE[ROLES.ANONYMOUS];
  const allowsAction = policy.actions.includes("*") || policy.actions.includes(action);
  if (!allowsAction) return { allow: false, reason: `action ${action} not allowed for role ${actor.role}` };

  if (!resourceTenantSlug) return { allow: false, reason: "tenant scope missing" };
  if (!actor.tenantSlug) return { allow: false, reason: "actor tenant context missing" };
  if (actor.tenantSlug !== String(resourceTenantSlug).trim().toLowerCase()) {
    return { allow: false, reason: "cross-tenant access denied" };
  }

  return { allow: true, reason: "policy allow" };
}

function deny(res, statusCode, error, details) {
  return res.status(statusCode).json({ error, details });
}

module.exports = {
  ACTIONS,
  ROLES,
  deriveActor,
  evaluatePolicy,
  normalizeRole,
  normalizeEmail,
  deny,
};
