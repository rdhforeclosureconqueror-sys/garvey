"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { PRICE_IDS, entitlementFromSubscription, verifyStripeSignature } = require("../server/subscriptionEntitlements");

function subscription(status, price, extra = {}) {
  return { id: "sub_test", customer: "cus_test", status, items: { data: [{ price: { id: price } }] }, ...extra };
}

test("only active or trialing matching subscriptions grant access", () => {
  assert.equal(entitlementFromSubscription(subscription("active", PRICE_IDS.garvey_learning), "garvey_learning"), true);
  assert.equal(entitlementFromSubscription(subscription("trialing", PRICE_IDS.youth_rite_of_passage), "youth_rite_of_passage"), true);
  for (const status of ["past_due", "unpaid", "canceled", "incomplete", "incomplete_expired", "paused"]) {
    assert.equal(entitlementFromSubscription(subscription(status, PRICE_IDS.garvey_learning), "garvey_learning"), false);
  }
  assert.equal(entitlementFromSubscription(subscription("active", PRICE_IDS.youth_rite_of_passage), "garvey_learning"), false);
  assert.equal(entitlementFromSubscription(subscription("active", PRICE_IDS.garvey_learning), "unknown"), false);
  assert.equal(entitlementFromSubscription(subscription("active", PRICE_IDS.garvey_learning, { customer: null }), "garvey_learning"), false);
  assert.equal(entitlementFromSubscription(null, "garvey_learning"), false);
});

test("signed webhook requires raw payload, valid signature and fresh timestamp", () => {
  const payload = Buffer.from('{"id":"evt_test"}');
  const secret = "whsec_test_secret";
  const now = 1800000000;
  const sign = (t, body = payload) => crypto.createHmac("sha256", secret).update(String(t) + ".").update(body).digest("hex");
  assert.equal(verifyStripeSignature({ payload, header: `t=${now},v1=${sign(now)}`, secret, now }), true);
  assert.equal(verifyStripeSignature({ payload: Buffer.from('{"id":"tampered"}'), header: `t=${now},v1=${sign(now)}`, secret, now }), false);
  assert.equal(verifyStripeSignature({ payload, header: `t=${now-400},v1=${sign(now-400)}`, secret, now }), false);
  assert.equal(verifyStripeSignature({ payload, header: "bad", secret, now }), false);
});
