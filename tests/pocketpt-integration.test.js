"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const pocketPt = require("../server/pocketPtIntegrationService");

const validEvent = () => ({
  contract:"leader_within_pocketpt_bridge_v1", contract_version:1, event_id:"ppt_evt_synthetic_001", event_type:"fitness_assignment.completed", provider:"POCKET_PT", source_application:"pocketpt",
  assignment_ref:"LWFA-synthetic-assignment", status:"COMPLETED", completed_at:"2026-08-17T01:00:00.000Z"
});

test("G7 deployment markers identify the canonical bridge handlers without secrets", () => {
  assert.equal(pocketPt.CONTRACT,"leader_within_pocketpt_bridge_v1");
  assert.equal(pocketPt.VERSION,1);
  assert.deepEqual(pocketPt.HANDLER_VERSIONS,{
    integration:"garvey-pocketpt-integration-v1",
    launch:"garvey-pocketpt-launch-v1",
    provider_event_receiver:"garvey-pocketpt-event-receiver-v1",
    movement_adapter:"garvey-pocketpt-movement-adapter-v1",
  });
  assert.equal(JSON.stringify(pocketPt.HANDLER_VERSIONS).includes("secret"),false);
});

test("launch JWT carries only the documented signed context", () => {
  const token=pocketPt.signLaunchToken({iss:"GARVEY",aud:"POCKET_PT",assignment_ref:"LWFA-test",subject_ref:"LWIS-test",exp:10,jti:"one"},"test-secret");
  const [header,body,signature]=token.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(header,"base64url")),{alg:"HS256",typ:"JWT",kid:"garvey-v1"});
  assert.equal(JSON.parse(Buffer.from(body,"base64url")).aud,"POCKET_PT");
  assert.equal(signature,crypto.createHmac("sha256","test-secret").update(`${header}.${body}`).digest("base64url"));
  assert.equal(token.includes("participant_id"),false);
});

test("event schema accepts the minimal V1 completion contract", () => {
  assert.equal(pocketPt.validateEvent(validEvent()).status,"COMPLETED");
});

test("event schema rejects unsupported versions, statuses, and identity-shaped references", () => {
  assert.throws(()=>pocketPt.validateEvent({...validEvent(),contract_version:2}),{code:"pocketpt_event_version_unsupported"});
  assert.throws(()=>pocketPt.validateEvent({...validEvent(),status:"SUCCESS"}),{code:"pocketpt_status_invalid"});
  assert.throws(()=>pocketPt.validateEvent({...validEvent(),assignment_ref:"42"}),{code:"pocketpt_event_invalid"});
});

test("event authentication binds issuer, audience, timestamp, and body signature", () => {
  process.env.POCKETPT_EVENT_SIGNING_SECRET="event-secret";
  const body=validEvent(), timestamp=new Date().toISOString();
  const req={body,headers:{"content-type":"application/json","x-pocketpt-timestamp":timestamp,"x-pocketpt-issuer":"POCKET_PT","x-pocketpt-audience":"GARVEY","x-pocketpt-signature":`sha256=${pocketPt.expectedEventSignature(body,timestamp)}`}};
  assert.doesNotThrow(()=>pocketPt.authenticateEvent(req));
  assert.throws(()=>pocketPt.authenticateEvent({...req,headers:{...req.headers,"x-pocketpt-audience":"BROWSER"}}),{code:"pocketpt_auth_failed"});
  assert.throws(()=>pocketPt.authenticateEvent({...req,body:{...body,status:"ERROR"}}),{code:"pocketpt_signature_invalid"});
});

test("events outside the replay window are rejected", () => {
  process.env.POCKETPT_EVENT_SIGNING_SECRET="event-secret";
  const body=validEvent(), timestamp=new Date(Date.now()-6*60*1000).toISOString();
  const req={body,headers:{"content-type":"application/json","x-pocketpt-timestamp":timestamp,"x-pocketpt-issuer":"POCKET_PT","x-pocketpt-audience":"GARVEY","x-pocketpt-signature":pocketPt.expectedEventSignature(body,timestamp)}};
  assert.throws(()=>pocketPt.authenticateEvent(req),{code:"pocketpt_event_replayed"});
});
