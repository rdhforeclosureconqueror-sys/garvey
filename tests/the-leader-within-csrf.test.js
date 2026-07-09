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
