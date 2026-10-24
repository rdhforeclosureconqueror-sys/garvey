#!/usr/bin/env node
/* Import rights-cleared 01.png ... 62.png. Usage: node scripts/import-adinkra-library.cjs /path/to/extracted-directory */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=process.argv[2];
if(!source){console.error('Usage: node scripts/import-adinkra-library.cjs <folder-containing-01.png-through-62.png>');process.exit(2)}
const root=path.resolve(__dirname,'..'),dest=path.join(root,'public/adinkra-library'),catalogPath=path.join(dest,'catalog.json');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
assert.equal(catalog.symbols.length,62,'Expected 62 catalog entries');
const validated=[];
for(let i=1;i<=62;i++){
 const filename=String(i).padStart(2,'0')+'.png',src=path.join(source,filename),buf=fs.readFileSync(src);
 assert.ok(buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),filename+' is not a PNG');
 assert.ok(buf.length>32&&buf.toString('ascii',12,16)==='IHDR',filename+' missing PNG header');
 assert.ok(buf.readUInt32BE(16)>0&&buf.readUInt32BE(20)>0,filename+' invalid image size');
 assert.equal(catalog.symbols[i-1].image,'/adinkra-library/'+filename);
 validated.push({filename,buf});
}
for(const {filename,buf} of validated)fs.writeFileSync(path.join(dest,filename),buf);
for(const symbol of catalog.symbols){symbol.artworkRights='approved';symbol.enabledForPublicGame=true}
catalog.publicationStatus='approved-artwork-imported';
catalog.note='All 62 images validated and imported following owner confirmation of public reuse rights.';
fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
console.log('Imported 62 numbered PNGs; catalog activated. Run tests before deployment.');
