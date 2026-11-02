"use strict";

// Subscription entitlement decisions are made server-side only.
// Never infer access from a Checkout redirect or a client-provided status.
const PRICE_IDS = Object.freeze({
  garvey_learning: "price_1UXCKv3JOrXsFGB5Kvmki99a",
  youth_rite_of_passage: "price_1UXCKx3JOrXsFGB5MG1wNOoq",
});
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function entitlementFromSubscription(subscription, platform) {
  if (!Object.prototype.hasOwnProperty.call(PRICE_IDS, platform)) return false;
  if (!subscription || !ACTIVE_STATUSES.has(subscription.status)) return false;
  if (!subscription.customer || !subscription.id) return false;
  const items = subscription.items?.data;
  if (!Array.isArray(items)) return false;
  return items.some((item) => item?.price?.id === PRICE_IDS[platform]);
}

function verifyStripeSignature({ payload, header, secret, now = Math.floor(Date.now() / 1000), tolerance = 300 }) {
  const crypto = require("node:crypto");
  if (!Buffer.isBuffer(payload) || !secret || typeof header !== "string") return false;
  const parts = header.split(",").map((x) => x.trim());
  const timestamp = parts.find((x) => x.startsWith("t="))?.slice(2);
  if (!timestamp || !/^\d+$/.test(timestamp)) return false;
  const time = Number(timestamp);
  if (!Number.isSafeInteger(time) || Math.abs(now - time) > tolerance) return false;
  const signatures = parts.filter((x) => /^v1=[a-f0-9]{64}$/i.test(x)).map((x) => x.slice(3));
  if (!signatures.length) return false;
  const expected = crypto.createHmac("sha256", secret).update(String(time) + ".").update(payload).digest();
  return signatures.some((hex) => crypto.timingSafeEqual(Buffer.from(hex, "hex"), expected));
}

module.exports = { PRICE_IDS, entitlementFromSubscription, verifyStripeSignature };
