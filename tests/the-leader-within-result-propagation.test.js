"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const svc=require("../server/leaderWithinService");

test("canonical assessment result resolves the complete youth profile",async()=>{
 const pool={query:async()=>({rows:[{id:42,completed_at:"2026-08-09T00:00:00Z",primary_archetype:"The Spark",supporting_archetype:"The Bridge"}]})};
 const r=await svc.resolveCanonicalAssessmentResult(pool,{participantId:7,enrollmentId:9});
 assert.equal(r.assessment_state,"results_available"); assert.equal(r.result_id,42);
 assert.equal(r.primary_archetype_name,"The Spark"); assert.equal(r.secondary_archetype_name,"The Bridge");
 assert.deepEqual(r.natural_strengths,["Communication","Creativity","Questioning","Explaining"]);
 assert.equal(r.growth_opportunity,"Listening and organizing ideas before speaking");
 assert.equal(r.suggested_practice,"Ask one thoughtful question or offer a useful idea");
});

test("propagation, safe acceptance, source tracking and progress contracts stay wired",()=>{
 const service=fs.readFileSync(require.resolve("../server/leaderWithinService"),"utf8");
 const routes=fs.readFileSync(require.resolve("../server/leaderWithinRoutes"),"utf8");
 assert.match(service,/resolveCanonicalAssessmentResult/); assert.match(service,/practice_already_selected/);
 assert.match(service,/assessment_suggestion/); assert.match(service,/confirm_replace/);
 assert.match(service,/weekly_story_progress/); assert.match(routes,/Mission Progress/); assert.match(routes,/Weekly Story Progress/);
 assert.match(service,/assessment_completed_count/); assert.match(routes,/of \$\{d\.outcomes\.enrollment_count\} participants/);
});
