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
 const headers={cookie:'tlw_facilitator_session=fac; garvey_owner_session=owner; tlw_youth_first_login_csrf=first-token','x-csrf-token':'first-token'};
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
});

test('first-login page initializes csrf and submits canonical header', async()=>{
 const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../server/leaderWithinRoutes.js'),'utf8');
 assert.match(source, /\/api\/the-leader-within\/auth\/first-login\/csrf/);
 assert.match(source, /tlw_youth_first_login_csrf/);
 assert.match(source, /"x-csrf-token":firstLoginCsrf/);
 assert.match(source, /credentials:"include"/);
 assert.match(source, /public_youth_credential_exchange/);
});
