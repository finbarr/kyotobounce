import { chromeGraphicsArgs } from '../../tools/remote/chrome-graphics.mjs';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const origin=process.env.KYOTO_URL || 'http://127.0.0.1:4173';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname),'Browser gameplay checks require an isolated local service');
const output = resolve(process.env.KYOTO_EVIDENCE || 'artifacts/phase3/browser-foundation');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || (process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'/usr/bin/google-chrome'),
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', ...chromeGraphicsArgs()]
});
const viewport={width:Number(process.env.KYOTO_SMOKE_WIDTH||1440),height:Number(process.env.KYOTO_SMOKE_HEIGHT||1000)};
assert.ok(Object.values(viewport).every(n=>Number.isInteger(n)&&n>=320&&n<=3840),'Valid smoke viewport');
const page = await browser.newPage({viewport});
const messages = [], states = [], errors = [];
page.on('console', message => { messages.push({ type: message.type(), text: message.text() }); });
page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
const progress = setInterval(() => console.log('Browser smoke running; latest log:', messages.at(-1)?.text?.slice(0,140)), 15000);
try {
  await page.goto(origin, { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.locator('#loading-name input[name="player"]').fill('Browser smoke', {timeout:60000});
  await page.locator('#loading-name button[type="submit"]').click();
  await page.waitForFunction(() => window.kyotoState?.ready, null, { timeout: 240000 });
  if(await page.evaluate(()=>window.kyotoState.briefing)){await page.locator('#briefing-play').click();await page.waitForFunction(()=>!window.kyotoState.briefingTransition);}
  const graphics = await page.evaluate(() => { const gl = document.querySelector('#game').getContext('webgl2'); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return {vendor: ext && gl.getParameter(ext.UNMASKED_VENDOR_WEBGL), renderer: ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}; });
  await writeFile(resolve(output, 'graphics.json'), JSON.stringify(graphics, null, 2));
  if (process.env.KYOTO_REQUIRE_GPU === '1') assert.ok(graphics.renderer && !/swiftshader|llvmpipe|softpipe/i.test(graphics.renderer), 'Hardware GPU required');
  states.push(await page.evaluate(() => window.kyotoState));
  console.log('READY', JSON.stringify(states.at(-1)));
  await page.screenshot({ path: resolve(output, '01-title.png') });
  await page.locator('#game').focus();
  await page.waitForFunction(() => window.kyotoState?.phase === 'Aim', null, { timeout: 30000 });
  await page.waitForTimeout(400);
  states.push(await page.evaluate(() => window.kyotoState));
  await page.screenshot({ path: resolve(output, '02-aim.png') });
  await page.keyboard.down('Space');
  await page.waitForTimeout(420);
  await page.keyboard.up('Space');
  await page.waitForFunction(() => window.kyotoState?.phase === 'Flight', null, { timeout: 10000 });
  await page.waitForTimeout(600);
  states.push(await page.evaluate(() => window.kyotoState));
  assert.ok(states.at(-1).flightTime > 0, 'Space initiates a simulated flight');
  await page.screenshot({ path: resolve(output, '03-flight.png') });
  await page.keyboard.press('r');
  await page.waitForFunction(() => window.kyotoState?.phase === 'Aim', null, { timeout: 10000 });
  const before = await page.evaluate(() => window.kyotoState.feet);
  await page.keyboard.down('w'); await page.waitForTimeout(600); await page.keyboard.up('w');
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => window.kyotoState.feet);
  assert.ok(Math.hypot(after.x-before.x, after.z-before.z) > .1, 'W moves the collision-based walker');
  states.push(await page.evaluate(() => window.kyotoState));
  assert.equal(errors.length, 0, 'No browser page errors');
  console.log('PASS browser startup, keyboard throw, flight, recall and walking');
  await writeFile(resolve(output, 'result.json'), JSON.stringify({
    status: 'pass', scope: 'First browser throw only; not final MVP acceptance',
    input: 'Playwright keyboard events on the rendered game canvas; no game control method calls',
    headless: true, viewport, states, errors
  }, null, 2));
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png'), timeout: 15000 }).catch(() => {});
  await writeFile(resolve(output, 'result.json'), JSON.stringify({status:'fail', error:String(error), states, errors}, null, 2));
  throw error;
} finally {
  clearInterval(progress);
  await writeFile(resolve(output, 'console.json'), JSON.stringify(messages, null, 2));
  await browser.close();
}
