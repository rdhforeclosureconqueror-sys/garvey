"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const pocketPt = require("../server/pocketPtIntegrationService");

const fixtureDir = path.join(__dirname, "../docs/the-leader-within/pocketpt-integration/fixtures");
const fixture = name => JSON.parse(fs.readFileSync(path.join(fixtureDir, name), "utf8"));
const completion = () => fixture("pocketpt-completion-v1.json");
const signedRequest = (body=completion(), overrides={}) => {
  process.env.POCKETPT_EVENT_SIGNING_SECRET="event-secret";
  const timestamp=new Date().toISOString();
  return {body,headers:{"content-type":"application/json","x-pocketpt-timestamp":timestamp,"x-pocketpt-issuer":"POCKET_PT","x-pocketpt-audience":"GARVEY","x-pocketpt-signature":`sha256=${pocketPt.expectedEventSignature(body,timestamp)}`,...overrides}};
};

test("canonical contract identity and fixture hashes cannot silently drift", () => {
  const manifest=fixture("manifest.json");
  assert.equal(pocketPt.CONTRACT,"leader_within_pocketpt_bridge_v1");
  assert.equal(pocketPt.VERSION,1);
  for(const [name,hash] of Object.entries(manifest.sha256)) assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(fixtureDir,name))).digest("hex"),hash);
});

test("Garvey launch claims byte-semantically match the canonical Pocket PT fixture", () => {
  const expected=fixture("garvey-launch-v1.json");
  const actual=pocketPt.buildLaunchClaims({assignmentRef:expected.assignment_ref,subjectRef:expected.subject_ref,week:1,session:"a",now:expected.iat,jti:expected.jti,returnUrl:expected.return_url});
  assert.deepEqual(actual,expected);
  assert.match(actual.assignment_ref,/^LWFA-[A-Za-z0-9_-]{8,}$/);
  assert.match(actual.subject_ref,/^LWIS-[A-Za-z0-9_-]{8,}$/);
  assert.equal(actual.exp-actual.iat,300);
});

test("launch JWT is HS256 with kid and signs header.payload", () => {
  const claims=fixture("garvey-launch-v1.json");
  const token=pocketPt.signLaunchToken(claims,"test-secret");
  const [header,payload,signature]=token.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(header,"base64url")),{alg:"HS256",typ:"JWT",kid:"garvey-v1"});
  assert.deepEqual(JSON.parse(Buffer.from(payload,"base64url")),claims);
  assert.equal(signature,crypto.createHmac("sha256","test-secret").update(`${header}.${payload}`).digest("base64url"));
});

test("canonical completion, in-progress, and safety-hold fixtures validate", () => {
  for(const name of ["pocketpt-completion-v1.json","pocketpt-in-progress-v1.json","pocketpt-safety-hold-v1.json"]) assert.deepEqual(pocketPt.validateEvent(fixture(name)),fixture(name));
});

test("event contract enforces version, provider, source, event type, status, and reference", () => {
  const cases=[
    [{...completion(),contract_version:2},"pocketpt_event_version_unsupported"],
    [{...completion(),contract:"other"},"pocketpt_event_version_unsupported"],
    [{...completion(),provider:"OTHER"},"pocketpt_event_invalid"],
    [{...completion(),source_application:"leader_within"},"pocketpt_event_invalid"],
    [{...completion(),event_type:"fitness_assignment.in_progress"},"pocketpt_event_invalid"],
    [{...completion(),status:"SUCCESS"},"pocketpt_status_invalid"],
    [{...completion(),assignment_ref:"42"},"pocketpt_event_invalid"],
  ];
  for(const [body,code] of cases) assert.throws(()=>pocketPt.validateEvent(body),{code});
});

test("completed_at is UTC RFC 3339 and belongs only to completion", () => {
  assert.throws(()=>pocketPt.validateEvent({...completion(),completed_at:"2026-08-16T20:00:00-05:00"}),{code:"pocketpt_event_invalid"});
  assert.throws(()=>pocketPt.validateEvent({...fixture("pocketpt-in-progress-v1.json"),completed_at:"2026-08-17T00:00:00.000Z"}),{code:"pocketpt_event_invalid"});
});

test("minimum event projection rejects fitness and health detail", () => {
  assert.deepEqual([...pocketPt.EVENT_FIELDS].sort(),["assignment_ref","completed_at","contract","contract_version","event_id","event_type","provider","source_application","status"]);
  for(const field of ["participant_id","program_ref","session_ref","exercise","reps","readiness","pain","sleep","soreness","safety_reason"]) assert.throws(()=>pocketPt.validateEvent({...completion(),[field]:"private"}),{code:"pocketpt_event_invalid"});
});

test("event HMAC is SHA-256 over timestamp dot compact JSON", () => {
  const body=completion(), timestamp="2026-08-17T00:00:01.000Z";
  assert.equal(pocketPt.expectedEventSignature(body,timestamp,"event-secret"),crypto.createHmac("sha256","event-secret").update(`${timestamp}.${JSON.stringify(body)}`).digest("hex"));
});

test("authentication binds content type, issuer, audience, signature, and five-minute window", () => {
  const request=signedRequest();
  assert.doesNotThrow(()=>pocketPt.authenticateEvent(request));
  assert.throws(()=>pocketPt.authenticateEvent({...request,headers:{...request.headers,"content-type":"text/plain"}}),{status:415});
  assert.throws(()=>pocketPt.authenticateEvent(signedRequest(completion(),{"x-pocketpt-issuer":"OTHER"})),{code:"pocketpt_auth_failed"});
  assert.throws(()=>pocketPt.authenticateEvent(signedRequest(completion(),{"x-pocketpt-audience":"OTHER"})),{code:"pocketpt_auth_failed"});
  assert.throws(()=>pocketPt.authenticateEvent(signedRequest(completion(),{"x-pocketpt-signature":"sha256=00"})),{code:"pocketpt_signature_invalid"});
  const stale=new Date(Date.now()-301000).toISOString();
  assert.throws(()=>pocketPt.authenticateEvent(signedRequest(completion(),{"x-pocketpt-timestamp":stale,"x-pocketpt-signature":`sha256=${pocketPt.expectedEventSignature(completion(),stale)}`})),{code:"pocketpt_event_replayed"});
});

test("event_id is an opaque provider idempotency key", () => {
  assert.match(completion().event_id,/^ppt_evt_[A-Za-z0-9_-]{6,}$/);
  assert.throws(()=>pocketPt.validateEvent({...completion(),event_id:"1"}),{code:"pocketpt_event_invalid"});
});
