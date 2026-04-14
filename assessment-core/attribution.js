"use strict";

function attributionSnapshot(ctx = {}) {
  const sourceType = ctx.source_type || ctx.source || ctx.tap_source || null;
  const campaign = ctx.campaign || ctx.cid || null;
  const rid = ctx.rid || ctx.crid || ctx.user_id || null;
  const crid = ctx.crid || ctx.rid || ctx.user_id || null;
  const tapSession = ctx.tap_session || ctx.session_id || null;
  return {
    tenant: ctx.tenant || null,
    tenant_id: ctx.tenant_id || ctx.tenant || null,
    business_owner_id: ctx.business_owner_id || ctx.owner_id || null,
    email: ctx.email || null,
    name: ctx.name || null,
    cid: ctx.cid || campaign || null,
    campaign: campaign || null,
    crid: crid,
    rid: rid,
    source: sourceType,
    source_type: sourceType,
    tap_source: ctx.tap_source || null,
    source_path: ctx.source_path || ctx.tap_source || ctx.source_type || ctx.entry || null,
    medium: ctx.medium || null,
    tap_session: tapSession,
    session_id: tapSession,
    session_alias: tapSession,
  };
}

module.exports = { attributionSnapshot };
