const test = require('node:test');
const assert = require('node:assert/strict');
const { createLeaderWithinRouter } = require('../server/leaderWithinRoutes');

function req(method,path,headers={}){ return {method,path,headers,protocol:'https'}; }
function res(){ return {statusCode:200, headers:{}, setHeader(k,v){this.headers[k.toLowerCase()]=v}, status(c){this.statusCode=c; return this}, json(x){this.body=x; return this}}; }

test('foreign origin is rejected for Leader Within mutations', async()=>{
 const router=createLeaderWithinRouter({query:async()=>({rows:[]})});
 const layer=router.stack.find(l=>l.handle && l.handle.name==='requireTrustedOrigin');
 const out=res(); let called=false;
 layer.handle(req('POST','/api/the-leader-within/my-program/reflections',{origin:'https://malicious.example',host:'garveyfrontend.onrender.com'}),out,()=>{called=true});
 assert.equal(called,false); assert.equal(out.statusCode,403);
});

test('CSRF token is required for cookie-authenticated youth mutations', async()=>{
 const router=createLeaderWithinRouter({query:async()=>({rows:[]})});
 const layer=router.stack.find(l=>l.handle && l.handle.name==='requireCsrf');
 const out=res(); let called=false;
 layer.handle({method:'POST',path:'/api/the-leader-within/my-program/reflections',headers:{},leaderWithinYouthActor:{csrf_token:'good'}},out,()=>{called=true});
 assert.equal(called,false); assert.equal(out.statusCode,403);
 const out2=res(); layer.handle({method:'POST',path:'/api/the-leader-within/my-program/reflections',headers:{'x-csrf-token':'good'},leaderWithinYouthActor:{csrf_token:'good'}},out2,()=>{called=true});
 assert.equal(called,true);
});

test('first-login exchange uses public credential-exchange csrf and ignores facilitator csrf precedence', async()=>{
 const router=createLeaderWithinRouter({query:async()=>({rows:[]})});
 const layer=router.stack.find(l=>l.handle && l.handle.name==='requireCsrf');
 const headers={cookie:'tlw_facilitator_session=fac; garvey_owner_session=owner; tlw_youth_first_login_csrf='+'a'.repeat(64),'x-csrf-token':'a'.repeat(64)};
 const out=res(); let called=false;
 layer.handle({method:'POST',path:'/api/the-leader-within/auth/first-login',headers,leaderWithinFacilitatorActor:{csrf_token:'fac-token'}},out,()=>{called=true});
 assert.equal(called,true);
 assert.equal(out.statusCode,200);
});

test('first-login exchange missing csrf returns accurate safe error', async()=>{
 const router=createLeaderWithinRouter({query:async()=>({rows:[]})});
 const layer=router.stack.find(l=>l.handle && l.handle.name==='requireCsrf');
 const out=res(); let called=false;
 layer.handle({method:'POST',path:'/api/the-leader-within/auth/first-login',headers:{cookie:'tlw_facilitator_session=fac; garvey_owner_session=owner'},leaderWithinFacilitatorActor:{csrf_token:'fac-token'}},out,()=>{called=true});
 assert.equal(called,false);
 assert.equal(out.statusCode,403);
 assert.equal(out.body.error,'csrf_failed');
 assert.equal(out.body.message,'The secure form expired. Reload and try again.');
 assert.equal(out.body.route_classification,'public_youth_credential_exchange');
 assert.equal(out.body.exact_safe_denial_reason,'csrf_header_missing');
 assert.equal(out.body.rolled_back,false);
});

test('first-login page initializes csrf and submits canonical header', async()=>{
 const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../server/leaderWithinRoutes.js'),'utf8');
 assert.match(source, /\/api\/the-leader-within\/auth\/first-login\/csrf/);
 assert.match(source, /tlw_youth_first_login_csrf/);
 assert.match(source, /"x-csrf-token":firstLoginCsrf/);
 assert.match(source, /credentials:"include"/);
 assert.match(source, /public_youth_credential_exchange/);
});


test('first-login csrf diagnostics detect duplicate binding cookies deterministically', async()=>{
 const router=createLeaderWithinRouter({query:async()=>({rows:[]})});
 const layer=router.stack.find(l=>l.handle && l.handle.name==='requireCsrf');
 const token='b'.repeat(64);
 const out=res(); let called=false;
 layer.handle({method:'POST',path:'/api/the-leader-within/auth/first-login',headers:{cookie:`tlw_youth_first_login_csrf=${token}; tlw_youth_first_login_csrf=${token}`,'x-csrf-token':token}},out,()=>{called=true});
 assert.equal(called,false);
 assert.equal(out.statusCode,403);
 assert.equal(out.body.exact_safe_denial_reason,'duplicate_csrf_cookie');
 assert.equal(out.body.csrf_binding_cookie_occurrence_count,2);
 assert.equal(out.body.csrf_validator_count,1);
});

test('first-login csrf initializer uses canonical root-path HttpOnly cookie and clears historical paths', async()=>{
 const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../server/leaderWithinRoutes.js'),'utf8');
 assert.match(source, /FIRST_LOGIN_CSRF_COOKIE = "tlw_youth_first_login_csrf"/);
 assert.match(source, /return `Path=\/; SameSite=/);
 assert.match(source, /HttpOnly; Max-Age=900/);
 assert.match(source, /\["\/","\/api","\/api\/the-leader-within","\/the-leader-within","\/the-leader-within\/first-login"\]/);
 assert.match(source, /Cache-Control','no-store'/);
 assert.doesNotMatch(source, /Path=\/the-leader-within; SameSite=\$\{secure\?"None":"Lax"\}/);
});

test('first-login page refreshes csrf after failed submit and prevents double submit', async()=>{
 const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../server/leaderWithinRoutes.js'),'utf8');
 assert.match(source, /async function refreshFirstLoginCsrf/);
 assert.match(source, /b\.dataset\.submitting==="1"/);
 assert.match(source, /await refreshFirstLoginCsrf\(\)/);
 assert.doesNotMatch(source, /console\.log|firstLoginCsrf.*console/);
});
