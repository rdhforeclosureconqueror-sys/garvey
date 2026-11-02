"use strict";
// Synthetic membership acceptance suite: no network, database, or Stripe credentials.
// This suite validates policy contracts, NOT end-to-end checkout or deployment.
const { PRICE_IDS, entitlementFromSubscription, verifyStripeSignature } = require("./subscriptionEntitlements");
const crypto = require("node:crypto");

function runMembershipAcceptance() {
  const cases = [];
  function check(name, condition) { cases.push({ name, status: condition ? "PASS" : "FAIL" }); }
  const make = (status, price, customer = "cus_synthetic") => ({
    id: "sub_synthetic", customer, status, items: { data: [{ price: { id: price } }] },
  });
  const education = PRICE_IDS.garvey_learning;
  const passage = PRICE_IDS.youth_rite_of_passage;
  check("Genius Learning active membership grants its own entitlement", entitlementFromSubscription(make("active", education), "garvey_learning"));
  check("Rite of Passage membership cannot unlock Genius Learning", !entitlementFromSubscription(make("active", passage), "garvey_learning"));
  check("Genius Learning membership cannot unlock Rite of Passage", !entitlementFromSubscription(make("active", education), "youth_rite_of_passage"));
  check("Unpaid membership denies access", !entitlementFromSubscription(make("unpaid", education), "garvey_learning"));
  check("Past-due membership denies access", !entitlementFromSubscription(make("past_due", education), "garvey_learning"));
  check("Canceled membership denies access", !entitlementFromSubscription(make("canceled", education), "garvey_learning"));
  check("Trialing membership grants matching entitlement", entitlementFromSubscription(make("trialing", education), "garvey_learning"));
  check("Missing customer denies access", !entitlementFromSubscription(make("active", education, null), "garvey_learning"));
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from('{"id":"evt_synthetic"}');
  const secret = "whsec_synthetic_only";
  const sign = (body, time) => crypto.createHmac("sha256", secret).update(String(time) + ".").update(body).digest("hex");
  check("Authentic webhook signature accepted", verifyStripeSignature({ payload, header: `t=${now},v1=${sign(payload, now)}`, secret, now }));
  check("Tampered webhook payload rejected", !verifyStripeSignature({ payload: Buffer.from('{"id":"modified"}'), header: `t=${now},v1=${sign(payload, now)}`, secret, now }));
  check("Expired webhook signature rejected", !verifyStripeSignature({ payload, header: `t=${now-400},v1=${sign(payload, now-400)}`, secret, now }));
  const unavailable = [
    "Authenticated parent checkout session",
    "Stripe customer mapped to parent account",
    "Signed webhook delivery and idempotent persistence",
    "Protected lessons enforced against stored entitlement",
    "Stripe test-mode renewal, failure and cancellation",
    "Billing portal and production deployment verification",
  ].map((name) => ({ name, status: "NOT_CONFIGURED" }));
  return { suite: "synthetic_membership_contract_v1", synthetic: true, passed: cases.filter(x => x.status === "PASS").length, failed: cases.filter(x => x.status === "FAIL").length, not_configured: unavailable.length, cases: [...cases, ...unavailable] };
}
module.exports = { runMembershipAcceptance };
