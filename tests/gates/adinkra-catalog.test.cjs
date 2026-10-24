const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../../public/adinkra-library/catalog.json'),'utf8'));
assert.equal(catalog.symbols.length,62,'PDF has 62 numbered entries');
assert.deepEqual(catalog.symbols.map(s=>s.id),Array.from({length:62},(_,i)=>i+1),'all entry numbers must be unique and sequential');
assert.equal(catalog.symbols[1].name,'Sankofa (bird)');
assert.equal(catalog.symbols[2].name,'Sankofa (heart)');
for(const symbol of catalog.symbols){
 assert.match(symbol.image,/^\/adinkra-library\/[0-9]{2}\.png$/);
 assert.equal(symbol.enabledForPublicGame,false,'unlicensed artwork must not be activated');
 assert.equal(symbol.artworkRights,'unverified','no permission is established by the PDF');
}
console.log('PASS: 62-entry catalog, distinct Sankofa variants, artwork rights gate');
