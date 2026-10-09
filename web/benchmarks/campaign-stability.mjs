// Cold loading and real campaign navigation. No scene or playback substitutions.
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {backgroundInput} from '../tests/background-input.mjs';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4425';
assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Use an isolated local service');
const out=resolve(process.argv[2]||'.local/campaign/final-audit/browser');
assert(out.startsWith(resolve('.local')+'/'));await mkdir(out,{recursive:true});
const courses=JSON.parse(await readFile('web/starter-challenges.json'));
assert.equal(courses.length,30);
const hashes={};
for(const file of ['web/starter-challenges.json','web/v2/assets.json','web/public/game.js','web/public/station-lighting.js','web/public/briefing.js','web/benchmarks/campaign-stability.mjs'])
 hashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--enable-webgl','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
await backgroundInput(context);
const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[],reports=[],receipts=[];
page.setDefaultTimeout(30000);
page.on('pageerror',e=>errors.push(String(e)));
page.on('websocket',ws=>ws.on('framesent',f=>{try{const m=JSON.parse(String(f.payload));if(m.type==='client-performance')reports.push(m.report);}catch{}}));
await page.addInitScript(()=>{
 window.campaignAudit={tasks:[],frames:[],marks:[]};
 new PerformanceObserver(list=>{for(const e of list.getEntries())campaignAudit.tasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask'});
 if(PerformanceObserver.supportedEntryTypes.includes('long-animation-frame'))new PerformanceObserver(list=>{
  for(const e of list.getEntries())campaignAudit.frames.push({start:e.startTime,duration:e.duration,scripts:e.scripts.map(s=>({duration:s.duration,source:s.sourceURL,function:s.sourceFunctionName,position:s.sourceCharPosition,invoker:s.invoker}))});
 }).observe({type:'long-animation-frame'});
});
const mark=name=>page.evaluate(name=>{campaignAudit.marks.push({name,time:performance.now(),audio:window.kyotoState?.audio});},name);
const profile=process.env.KYOTO_PROFILE==='1';let status='fail',failure;
if(profile){await cdp.send('Profiler.enable');await cdp.send('Profiler.start');}
try{
 await page.goto(origin);
 await page.locator('#loading-name input[name="player"]').fill('Campaign audit',{timeout:120000});
 await page.getByRole('button',{name:'LET’S PLAY →'}).click();
 await page.waitForFunction(()=>window.kyotoState?.ready&&!document.body.classList.contains('is-loading'),null,{timeout:120000});
 await mark('ready');
 if(await page.locator('#tutorial-hide').isVisible())await page.locator('#tutorial-hide').click();
 if(await page.evaluate(()=>kyotoState.briefing))await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!kyotoState.briefingTransition);
 for(const viewport of [{width:1440,height:900},{width:1280,height:720}]){
  await page.setViewportSize(viewport);
  for(const course of courses){
   await mark(`${course.id}-${viewport.width}`);
   await page.keyboard.press('l');
   await page.locator('#campaign-chapter').selectOption(String(course.campaign.chapter));
   assert.equal(await page.locator('#course-list button[data-challenge]').count(),5,'Each chapter lists five courses');
   await page.locator(`#course-list button[data-challenge="${course.id}"]`).click();
   await page.waitForFunction(id=>kyotoState.challenge?.id===id,course.id);
   if(!await page.evaluate(()=>kyotoState.briefing)){
    if(!await page.locator('#show-overview').isVisible())await page.keyboard.press('l');
    await page.locator('#show-overview').click();
   }
   await page.waitForFunction(()=>kyotoState.briefing);await page.waitForTimeout(150);
   const markers=await page.evaluate(()=>{
    const blocks=[document.querySelector('.briefing-heading'),document.querySelector('.briefing-bottom'),document.getElementById('result-leaderboard')].filter(e=>e?.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>e.getBoundingClientRect());
    return [...document.querySelectorAll('#briefing-route circle'),document.getElementById('map-start'),...(!document.getElementById('map-goal').hidden?[document.getElementById('map-goal')]:[])].map(e=>{
     const r=e.getBoundingClientRect();return {tag:e.id||e.tagName,x:r.x,y:r.y,width:r.width,height:r.height,clear:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&blocks.every(b=>r.right<=b.left||r.left>=b.right||r.bottom<=b.top||r.top>=b.bottom)};
    });
   });
   const receipt={id:course.id,viewport,markers,pass:markers.length===course.waypoints.length+1+(course.goal?1:0)&&markers.every(m=>m.clear)};
   receipts.push(receipt);
   if(!receipt.pass||[0,5,11,19,20,26,27,29].includes(course.order))await page.screenshot({path:resolve(out,`${course.id}-${viewport.width}.png`)});
   assert(receipt.pass,`${course.id} ${viewport.width}: overview markers are blocked`);
   await page.locator('#briefing-play').click();
   await page.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition);
   assert.equal(await page.evaluate(()=>document.pointerLockElement),null,'The audit must never capture the desktop pointer');
   await page.locator('#game').focus();await page.keyboard.press('h');
   const hint=await page.evaluate(()=>({yaw:kyotoState.yaw,pitch:kyotoState.pitch,top:kyotoState.top,kick:kyotoState.kick}));
   for(const key of ['yaw','pitch','top','kick'])assert(Math.abs(key==='yaw'?((hint[key]-course.hint[key]+540)%360)-180:hint[key]-course.hint[key])<.001,`${course.id}: ${key} hint`);
   console.log('PASS',course.id,viewport.width);
  }
 }
 await page.waitForTimeout(5000);await mark('complete');
 const measured=await page.evaluate(()=>({audio:kyotoState.audio,ready:campaignAudit.marks.find(m=>m.name==='ready').time,tasks:campaignAudit.tasks}));
 assert.equal(measured.audio.skippedMusicSteps,0,'Cold entry and campaign navigation keep music scheduled');
 assert(measured.tasks.filter(t=>t.start>=measured.ready).every(t=>t.duration<200),'No 200 ms main-thread stalls after entry');
 assert(measured.tasks.filter(t=>t.start<measured.ready).every(t=>t.duration<750),'Cold preparation yields before a 750 ms stall');
 assert.deepEqual(errors,[]);status='pass';
}catch(error){failure=String(error);throw error;}
finally{
 if(profile){const {profile:p}=await cdp.send('Profiler.stop');await writeFile(resolve(out,'cold.cpuprofile'),JSON.stringify(p));}
 const measurement=await page.evaluate(()=>{
  const gl=document.getElementById('game').getContext('webgl2'),info=gl.getExtension('WEBGL_debug_renderer_info');
  return {audit:campaignAudit,audio:kyotoState?.audio,startupMs:kyotoState?.startupMs,timeOrigin:performance.timeOrigin,graphics:info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):null};
 }).catch(()=>null);
 await writeFile(resolve(out,'result.json'),JSON.stringify({status,failure,profile,browser:browser.version(),hashes,receipts,errors,reports,...measurement},null,2));
 await context.close();await browser.close();
}
