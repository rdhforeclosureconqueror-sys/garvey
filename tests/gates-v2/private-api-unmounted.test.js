'use strict';const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('server entrypoint does not import or mount Gates V2 private contract',()=>{const source=fs.readFileSync(path.join(__dirname,'../../server/index.js'),'utf8');assert.doesNotMatch(source,/gatesV2Private(?:Handlers|Contract)/);});
