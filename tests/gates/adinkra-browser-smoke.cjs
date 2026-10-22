'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:8765/gamehub/content/index.html');
    await page.waitForFunction(() => !!window.MateMasieChallenge && !!window.TenGatesAdinkra);
    await page.waitForFunction(() => !!adinkraSunday, {timeout:15000});
    await page.locator('#startBtn').click();
    await page.waitForFunction(() => !!game && game.dialogueOpen);
    await page.locator('#dialogueChoices button').first().click();
    await page.evaluate(() => handleNpc(npcData.find(n => n.id === 'keeper')));
    await page.getByText('At the South Bridge, Mara wears a blue scarf').waitFor();
    await page.getByRole('button', {name:'I am ready to recall the clue'}).click();
    await page.getByRole('button', {name:'A red drum and a golden bell'}).click();
    await page.getByText('Listen again for what Mara wears').waitFor();
    await page.getByRole('button', {name:'Hear the clue again'}).click();
    await page.getByRole('button', {name:'I am ready to recall the clue'}).click();
    await page.getByRole('button', {name:'A blue scarf and a woven basket'}).click();
    await page.getByText('You listened for meaning').waitFor();
    await page.getByRole('button', {name:'Continue the journey'}).click();
    assert.equal(await page.locator('#dialogue').evaluate(el => el.classList.contains('hidden')), true);
    await page.locator('#restartBtn').click();
    await page.waitForFunction(() => !!game && game.dialogueOpen);
    await page.locator('#dialogueChoices button').first().click();
    await page.evaluate(() => handleNpc(npcData.find(n => n.id === 'keeper')));
    await page.getByText('At the South Bridge, Mara wears a blue scarf').waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: curriculum load, Keeper recall, gentle retry, correct answer, restart');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
