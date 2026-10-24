const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/gate-one-experience.html');
  await page.waitForFunction(()=>document.querySelector('.scene .eyebrow').textContent.includes('Primary symbol: Mate Masie'));
  assert.equal(await page.locator('.day').count(),7);
  await page.locator('[data-day="0"]').click();
  const image=page.locator('#visual img');
  await image.waitFor({state:'attached'});
  assert.match(await image.getAttribute('src'),/Mate%20Masie.png/);
  await page.waitForFunction(()=>{const x=document.querySelector('#visual img');return x&&x.complete&&x.naturalWidth>0},{timeout:10000});
  await page.getByRole('heading',{name:'Get ready to focus'}).waitFor();
  await page.getByRole('button',{name:'I’m ready · Show the symbol'}).click();
  await page.getByRole('heading',{name:'Take a mental picture'}).waitFor();
  await page.getByRole('heading',{name:'Rebuild the symbol'}).waitFor({timeout:10000});
  assert.equal(await page.locator('.puzzle-piece').count(),4);
  assert.equal(await page.getByRole('button',{name:'Enter the story →'}).isVisible(),false,'story is gated by symbol reveal');
  await page.evaluate(()=>{
    for(let attempt=0;attempt<8;attempt++){
      const tiles=[...document.querySelectorAll('.puzzle-piece')];
      const positions=tiles.map(b=>b.style.backgroundPosition);
      const targets=['0% 0%','100% 0%','0% 100%','100% 100%'];
      const wrong=positions.findIndex((p,i)=>p!==targets[i]);
      if(wrong<0)break;
      const match=positions.findIndex((p,i)=>p===targets[wrong]&&i!==wrong);
      tiles[wrong].click();
      document.querySelectorAll('.puzzle-piece')[match].click();
    }
  });
  await page.getByRole('heading',{name:'Mate Masie'}).waitFor();
  await page.getByRole('button',{name:'Enter the story →'}).click();
  await page.getByRole('heading',{name:'Mara and the Message at the Accra Bridge'}).waitFor();
  await page.locator('#symbolCascade').waitFor({state:'visible'});
  assert.equal(await page.locator('.cascade-cell').count(),84,'six columns and fourteen rows');
  await page.getByRole('button',{name:'Start game'}).click();
  assert.equal(await page.locator('.cascade-cell img').count()>=24,true,'four rows seeded before first drop');
  await page.waitForTimeout(1200);
  assert.ok((await page.locator('.cascade-cell img').count())>=24,'symbols drop into tank');
  await page.getByRole('button',{name:'Pause game'}).click();
  const frozen=await page.locator('#cascadeTime').textContent();
  await page.waitForTimeout(1100);
  assert.equal(await page.locator('#cascadeTime').textContent(),frozen,'pause freezes timer');
  await page.getByRole('button',{name:'New game'}).click();
  assert.equal(await page.locator('#cascadeTime').textContent(),'Time 0s');
  await page.getByRole('button',{name:'🔊 Read this page aloud'}).waitFor();
  let voiceRequest=null;
  await page.route('**/api/skill-world/audio',async route=>{voiceRequest=route.request().postDataJSON();await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'test_upstream_unavailable'})})});
  await page.getByRole('button',{name:'🔊 Read this page aloud'}).click();
  await page.getByRole('button',{name:/Retry AI narration/}).waitFor();
  assert.match(await page.getByRole('status',{name:''}).first().textContent(),/server_response.*HTTP 503/);
  assert.equal(voiceRequest.voice,'alloy');
  assert.match(voiceRequest.text,/Morning traffic/);
  assert.equal(await page.getByRole('progressbar',{name:'Story reading progress'}).getAttribute('aria-valuenow'),'1');
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'no horizontal overflow on phone');
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Read next page →'}).click();
  await page.getByRole('button',{name:'Continue →'}).click();
  await page.getByRole('heading',{name:'Match the symbols'}).waitFor();
  assert.equal(await page.locator('.match-card').count(),6);
  await page.evaluate(()=>{
    const cards=matchCards.map((c,i)=>({...c,i}));
    for(const a of cards.filter(c=>c.type==='image')){
      const b=cards.find(c=>c.id===a.id&&c.type==='meaning');
      document.querySelectorAll('.match-card')[a.i].click();
      document.querySelectorAll('.match-card')[b.i].click();
    }
  });
  await page.getByRole('button',{name:'Continue →'}).click();
  await page.getByRole('button',{name:'A blue scarf and a woven basket'}).click();
  await page.getByRole('button',{name:'Continue →'}).click();
  await page.getByRole('textbox',{name:'Your reflection'}).fill('I listened carefully to a friend.');
  await page.getByRole('button',{name:'Complete chapter'}).click();
  assert.match(await page.locator('#progressText').textContent(),/1 of 7/);
  await page.getByRole('button',{name:'Review practice history'}).click();
  assert.match(await page.locator('#historyList').textContent(),/listened carefully/);
  await page.reload();
  await page.getByRole('button',{name:'Review practice history'}).click();
  assert.match(await page.locator('#historyList').textContent(),/listened carefully/);
  assert.deepEqual(errors,[]);
  console.log('Gate One recurring smoke passed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
