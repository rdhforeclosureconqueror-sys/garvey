import assert from "node:assert/strict";
import { buildDashboardUrl } from "../server/dashboardUrl.js";

const full = buildDashboardUrl({
  tenant: "test-business",
  email: "Owner@Example.com",
  cid: "spring-launch",
  crid: "cr_123",
  owner_email: "Boss@Example.com",
  owner_rid: "rid_777",
});

assert.equal(
  full,
  "/dashboard.html?tenant=test-business&email=owner%40example.com&cid=spring-launch&crid=cr_123&owner_email=boss%40example.com&owner_rid=rid_777"
);

const minimal = buildDashboardUrl({ tenant: "test-business" });
assert.equal(minimal, "/dashboard.html?tenant=test-business");

console.log("dashboard-url-sanity: ok");
