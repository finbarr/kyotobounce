// Exercise the real game with keyboard/DOM input; never capture the desktop pointer.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {backgroundInput} from './background-input.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4426';
assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Use an isolated local server');
const out=resolve('.local/skip-shot/browser');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--enable-webgl','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
await backgroundInput(context);
const page=await context.newPage(),commands=[],errors=[],shots=[];page.setDefaultTimeout(30000);
page.on('pageerror',error=>errors.push(String(error)));
page.on('websocket',ws=>ws.on('framesent',frame=>{const m=JSON.parse(String(frame.payload));if(m.type==='skip-shot')commands.push(m);}));
async function clearControl(selector){
 await page.locator(selector).waitFor({state:'visible'});
 const box=await page.locator(selector).evaluate(el=>{
  const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
  return {visible:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,clear:el===hit||el.contains(hit),height:r.height};
 });
 assert(box.visible&&box.clear&&box.height>=44,`${selector} must be visible, unobstructed and at least 44 px high`);
}
try{
 await page.goto(`${origin}/?level=atrium-clock-in`);
 await page.locator('#loading-name input[name="player"]').fill('Skip browser check',{timeout:120000});
 await page.getByRole('button',{name:'LET’S PLAY →'}).click();
 await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 if(await page.locator('#tutorial-hide').isVisible())await page.locator('#tutorial-hide').click();
 if(await page.evaluate(()=>kyotoState.briefing))await page.locator('#briefing-play').click();
 await page.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition&&kyotoState.challenge?.id==='atrium-clock-in');
 for(const method of ['keyboard','desktop','mobile']){
  if(method==='mobile')await page.setViewportSize({width:390,height:664});
  await page.locator('#game').focus();await page.keyboard.press('r');
  await page.waitForFunction(()=>kyotoState.phase==='Aim'&&!kyotoState.robotCelebrating);
  assert(!(await page.locator('#shot-skip').isVisible()));assert(!(await page.locator('#mobile-skip').isVisible()));
  await page.keyboard.press('h');await page.waitForTimeout(300);
  await page.keyboard.down('Space');await page.waitForFunction(()=>kyotoState.charging,null,{timeout:5000});await page.waitForTimeout(2900);await page.keyboard.up('Space');
  await page.waitForFunction(()=>kyotoState.phase==='Flight',null,{timeout:5000});
  const selector=method==='mobile'?'#mobile-skip':'#shot-skip';await clearControl(selector);
  await page.screenshot({path:resolve(out,`${method}-flight.png`)});
  const before=commands.length,started=Date.now();
  if(method==='keyboard')await page.keyboard.press('Enter');else await page.locator(selector).click();
  await page.waitForFunction(()=>kyotoState.phase==='Result'&&kyotoState.result);
  const state=await page.evaluate(()=>kyotoState),waitMs=Date.now()-started;
  assert.equal(commands.length-before,1);assert(state.result.saved&&state.result.success);
  assert.equal(state.result.waypointHits.length,2);assert(state.diagnostics.sleeping);
  assert.equal(Math.hypot(...Object.values(state.velocity)),0);assert.equal(Math.hypot(...Object.values(state.spin)),0);
  assert(waitMs<state.result.duration*500,'Skip bypasses playback');
  assert.equal(state.audio.playbackRate,1);assert.equal(state.pointerLocked,false);
  assert(!(await page.locator(selector).isVisible()));shots.push({method,waitMs,result:state.result});
  await page.waitForTimeout(850);await page.screenshot({path:resolve(out,`${method}-result.png`)});
 }
 // The last result still has its complete, seekable replay.
 const response=page.waitForResponse(r=>r.url().endsWith(`/api/replay/${shots.at(-1).result.attempt}`)&&r.ok());
 await page.locator('#watch-result').click();await page.waitForFunction(()=>kyotoState.mode==='replay');
 const replay=(await (await response).json()).replay;
 assert.equal(replay.duration,shots.at(-1).result.duration);assert(replay.poses.length>100);
 assert(!(await page.locator('#shot-skip').isVisible()));assert(!(await page.locator('#mobile-skip').isVisible()));
 if(await page.locator('#replay-play').textContent()==='Pause')await page.locator('#replay-play').click();
 await page.locator('#replay-scrub').focus();await page.keyboard.press('End');
 await page.waitForFunction(t=>Math.abs(kyotoState.replayTime-t)<.02,replay.duration);
 await page.keyboard.press('Home');await page.waitForFunction(()=>kyotoState.replayTime<=0);
 assert.deepEqual(errors,[]);
 console.log('PASS Enter, desktop and mobile Skip controls; authoritative rest/result, retry and full replay');
}catch(error){
 await page.screenshot({path:resolve(out,'failure.png')});
 await writeFile(resolve(out,'failure.json'),JSON.stringify({error:String(error),state:await page.evaluate(()=>window.kyotoState)},null,2));
 throw error;
}finally{
 await writeFile(resolve(out,'receipt.json'),JSON.stringify({shots,commands,errors},null,2));await browser.close();
}
