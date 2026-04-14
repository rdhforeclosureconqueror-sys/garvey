"use strict";

function attributionSnapshot(ctx = {}) {
  return {
    tenant: ctx.tenant || null,
    email: ctx.email || null,
    name: ctx.name || null,
    cid: ctx.cid || null,
    crid: ctx.crid || null,
    rid: ctx.rid || null,
    source: ctx.source || ctx.tap_source || ctx.source_type || null,
    medium: ctx.medium || null,
    campaign: ctx.campaign || ctx.cid || null,
    tap_session: ctx.tap_session || null,
    session_alias: ctx.tap_session || null,
  };
}

module.exports = { attributionSnapshot };
