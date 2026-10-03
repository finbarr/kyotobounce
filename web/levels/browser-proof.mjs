// Actual keyboard/DOM acceptance in the complete isolated game, never a rig.
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const [name,outArg,holdArg]=process.argv.slice(2);
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4425';
assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Use an isolated local server');
if(!name||!outArg||!holdArg)throw Error('Usage: node web/levels/browser-proof.mjs "Course name" .local/browser/fresh holdMs');
const course=JSON.parse(await readFile('web/starter-challenges.json')).find(c=>c.name===name);
assert(course,`Unknown course ${name}`);
const out=resolve(outArg);assert.ok(out.startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--enable-webgl','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
const page=await context.newPage();page.setDefaultTimeout(30000);const shots=[],commands=[],errors=[],replays=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('websocket',ws=>{ws.on('framereceived',f=>{try{const m=JSON.parse(String(f.payload));if(m.type==='replay')replays.push(m.replay);}catch{}});ws.on('framesent',f=>{try{const m=JSON.parse(String(f.payload));if(m.type!=='input')commands.push({at:Date.now(),...m});}catch{}});});
let status='fail';
try{
 await page.goto(origin);
 await page.locator('#loading-name input[name="player"]').fill('Campaign browser check',{timeout:120000});
 await page.getByRole('button',{name:'LET’S PLAY →'}).click();
 await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 // First entry offers coaching; every level also has an explicit overview.
 if(await page.locator('#tutorial-hide').isVisible())await page.locator('#tutorial-hide').click();
 if(await page.evaluate(()=>kyotoState.briefing))await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!kyotoState.briefingTransition);
 await page.keyboard.press('l');
 await page.locator('#campaign-chapter').selectOption(String(course.campaign.chapter));
 await page.locator(`#course-list button[data-challenge="${course.id}"]`).click();
 await page.waitForFunction(name=>kyotoState.challenge?.name===name,name);
 if(!await page.evaluate(()=>kyotoState.briefing)){
  if(!await page.locator('#show-overview').isVisible())await page.keyboard.press('l');
  await page.locator('#show-overview').click();
 }
 await page.waitForFunction(()=>kyotoState.briefing);await page.screenshot({scale:'css',path:resolve(out,'briefing.png')});
 await page.locator('#briefing-play').click();await page.waitForFunction(()=>window.kyotoState?.pointerLocked&&!window.kyotoState?.briefingTransition);
 const start=await page.evaluate(()=>kyotoState.feet);
 await page.keyboard.down('w');await page.waitForTimeout(500);await page.keyboard.up('w');await page.waitForTimeout(200);
 const walked=await page.evaluate(()=>kyotoState.feet);assert(Math.hypot(walked.x-start.x,walked.z-start.z)>.3,'WASD moves the player');
 await page.keyboard.press('l');await page.getByRole('button',{name:'↶ Start',exact:true}).click();
 await page.waitForFunction(start=>Math.hypot(kyotoState.feet.x-start.x,kyotoState.feet.z-start.z)<.1,start);
 await page.getByRole('button',{name:'Close levels'}).click();
 await page.locator('#game').focus();await page.keyboard.press('h');await page.waitForTimeout(500);await page.screenshot({scale:'css',path:resolve(out,'aim.png')});
 const holds=holdArg.split(',').map(Number);assert.ok(holds.length<=2&&holds.every(n=>n>=0&&n<=2800),'At most one retry');
 for(const hold of holds){
  await page.keyboard.down('Space');await page.waitForTimeout(hold);await page.keyboard.up('Space');
  await page.waitForFunction(()=>window.kyotoState?.phase==='Result'&&window.kyotoState?.result,null,{timeout:120000});const s=await page.evaluate(()=>window.kyotoState);shots.push(s);console.log(JSON.stringify({hold,power:s.result?.thrower?.power,score:s.result?.score,destination:s.result?.destinationReached,final:s.ball,frameMsP50:[...s.render.frameMs].sort((a,b)=>a-b)[60],audio:s.audio}));
  await page.waitForFunction(score=>document.getElementById('result-title').textContent===`${score.toLocaleString()} PTS`,s.result.score);
  await page.screenshot({scale:'css',path:resolve(out,`result-${shots.length}.png`)});
  if(s.result?.success&&s.result?.score>0)break;
  if(shots.length<holds.length){await page.keyboard.press('r');await page.waitForFunction(()=>window.kyotoState?.phase==='Aim');await page.keyboard.press('h');await page.waitForTimeout(300);}
 }
 const final=shots.at(-1);assert.equal(final.challenge.scoring,'waypoint-v3');assert.equal(final.result.success,true);assert.ok(final.result.score>0);
 assert.equal(final.result.waypointHits.length,final.challenge.waypoints.length);
 if(final.challenge.goal)assert.equal(final.result.destinationReached,true,'The authored solution includes its destination bonus');
 assert.ok(Object.values(final.velocity).every(v=>v===0)&&Object.values(final.spin).every(v=>v===0));
 // Watch the persisted replay and scrub with actual controls; do not fabricate state.
 const replayResponse=page.waitForResponse(r=>r.url().endsWith(`/api/replay/${final.result.attempt}`)&&r.ok());
 await page.locator('#watch-result').click();await page.waitForFunction(()=>window.kyotoState?.mode==='replay');
 const replay=(await (await replayResponse).json()).replay;replays.push(replay);
 assert.ok(replay?.poses?.length>1);assert.equal(replay.score,final.result.score);assert.equal(replay.layout,final.challenge.layout);assert.deepEqual(replay.waypointHits,final.result.waypointHits);
 if(final.challenge.requiredSurface)assert.ok(replay.contacts.some(c=>c.surface===final.challenge.requiredSurface),'Required route contact');
 if(await page.locator('#replay-play').textContent()==='Pause')await page.locator('#replay-play').click();
 await page.locator('#replay-scrub').focus();await page.keyboard.press('End');await page.waitForFunction(t=>Math.abs(window.kyotoState.replayTime-t)<.02,replay.duration);await page.screenshot({scale:'css',path:resolve(out,'replay-end.png')});
 await page.keyboard.press('Home');await page.waitForFunction(()=>window.kyotoState.replayTime<=0);await page.screenshot({scale:'css',path:resolve(out,'replay-start.png')});await page.locator('#close-replay').click();await page.waitForFunction(()=>window.kyotoState.mode==='play');
 // Recall/retry through actual input preserves the selected course and aiming affordance.
 await page.keyboard.press('r');await page.waitForFunction(()=>window.kyotoState?.phase==='Aim');await page.keyboard.press('h');await page.screenshot({scale:'css',path:resolve(out,'retry.png')});
 assert.deepEqual(errors,[]);status='pass';
}finally{if(status!=='pass')await page.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});await writeFile(resolve(out,'result.json'),JSON.stringify({status,scope:'Actual full-game DOM/keyboard completion, at most one retry; final layout binding must match native proof',shots,commands,errors,replays},null,2));await context.close();await browser.close();}
