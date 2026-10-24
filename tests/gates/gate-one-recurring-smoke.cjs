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
  const image=page.locator('#visual img');
  await image.waitFor();
  assert.match(await image.getAttribute('src'),/Mate%20Masie.png/);
  assert.equal(await image.evaluate(x=>x.complete&&x.naturalWidth>0),true,'uploaded symbol image loads');
  await page.getByRole('heading',{name:'Mara and the Message Beneath the Bridge'}).waitFor();
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Read next page →'}).click();
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
