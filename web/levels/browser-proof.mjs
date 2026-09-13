// Actual keyboard/DOM acceptance in the complete isolated game, never a rig.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const [name,outArg,holdArg]=process.argv.slice(2);
if(!name||!outArg||!holdArg)throw Error('Usage: node web/levels/browser-proof.mjs "Course name" .local/browser/fresh holdMs');
const out=resolve(outArg);assert.ok(out.startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-angle=gl','--enable-webgl','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:Number(process.env.BROWSER_SCALE||.25),recordVideo:{dir:out,size:{width:1440,height:900}}});
const page=await context.newPage();page.setDefaultTimeout(120000);const shots=[],commands=[],errors=[],replays=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('websocket',ws=>{ws.on('framereceived',f=>{try{const m=JSON.parse(String(f.payload));if(m.type==='replay')replays.push(m.replay);}catch{}});ws.on('framesent',f=>{try{const m=JSON.parse(String(f.payload));if(m.type!=='input')commands.push({at:Date.now(),...m});}catch{}});});
let status='fail';
try{
 await page.goto('http://127.0.0.1:4284');await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:300000});
 await page.getByRole('button',{name,exact:true}).click();await page.waitForFunction(()=>window.kyotoState?.briefing);await page.screenshot({scale:'css',path:resolve(out,'briefing.png')});
 await page.locator('#briefing-play').click();await page.waitForFunction(()=>window.kyotoState?.pointerLocked&&!window.kyotoState?.briefingTransition);
 await page.locator('canvas').focus();await page.keyboard.press('h');await page.waitForTimeout(500);await page.screenshot({scale:'css',path:resolve(out,'aim.png')});
 const holds=holdArg.split(',').map(Number);assert.ok(holds.length<=2&&holds.every(n=>n>=0&&n<=2800),'At most one retry');
 for(const hold of holds){
  await page.keyboard.down('Space');await page.waitForTimeout(hold);await page.keyboard.up('Space');
  await page.waitForFunction(()=>window.kyotoState?.phase==='Result',null,{timeout:120000});const s=await page.evaluate(()=>window.kyotoState);shots.push(s);console.log(JSON.stringify({hold,power:s.result?.thrower?.power,score:s.result?.score,destination:s.result?.destinationReached,final:s.ball,frameMs:s.render?.frameMs}));
  await page.screenshot({scale:'css',path:resolve(out,`result-${shots.length}.png`)});
  if(s.result?.success&&s.result?.score>0)break;
  if(shots.length<holds.length){await page.keyboard.press('r');await page.waitForFunction(()=>window.kyotoState?.phase==='Aim');await page.keyboard.press('h');await page.waitForTimeout(300);}
 }
 const final=shots.at(-1);assert.equal(final.challenge.scoring,'waypoint-v3');assert.equal(final.result.success,true);assert.ok(final.result.score>0);assert.ok(final.result.waypointHits.length>0);if(final.challenge.requiredSurface)assert.ok(final.result.contacts.some(c=>c.surface===final.challenge.requiredSurface),'Required route contact');assert.ok(Object.values(final.velocity).every(v=>v===0)&&Object.values(final.spin).every(v=>v===0));
 // Watch the persisted replay and scrub with actual controls; do not fabricate state.
 await page.keyboard.press('Escape');await page.locator('#watch-result').click();await page.waitForFunction(()=>window.kyotoState?.mode==='replay');
 const replay=replays.at(-1);assert.ok(replay?.poses?.length>1);assert.equal(replay.score,final.result.score);assert.equal(replay.layout,final.challenge.layout);assert.deepEqual(replay.waypointHits,final.result.waypointHits);
 await page.locator('#replay-scrub').focus();await page.keyboard.press('End');await page.waitForFunction(t=>Math.abs(window.kyotoState.replayTime-t)<.02,replay.duration);await page.screenshot({scale:'css',path:resolve(out,'replay-end.png')});
 await page.keyboard.press('Home');await page.waitForFunction(()=>window.kyotoState.replayTime<=0);await page.screenshot({scale:'css',path:resolve(out,'replay-start.png')});await page.locator('#close-replay').click();await page.waitForFunction(()=>window.kyotoState.mode==='play');
 // Recall/retry through actual input preserves the selected course and aiming affordance.
 await page.keyboard.press('r');await page.waitForFunction(()=>window.kyotoState?.phase==='Aim');await page.keyboard.press('h');await page.screenshot({scale:'css',path:resolve(out,'retry.png')});
 assert.deepEqual(errors,[]);status='pass';
}finally{await writeFile(resolve(out,'result.json'),JSON.stringify({status,scope:'Actual full-game DOM/keyboard completion, at most one retry; final layout binding must match native proof',shots,commands,errors,replays},null,2));await context.close();await browser.close();}
