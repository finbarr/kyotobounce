import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {backgroundInput} from './background-input.mjs';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {Shot} from '../public/physics/shot.js';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4430';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const out='.local/browser-physics/game';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--enable-webgl','--ignore-gpu-blocklist','--mute-audio']});
const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});await backgroundInput(context);
const page=await context.newPage(),errors=[],requests=[],results=[];let benchmark;page.setDefaultTimeout(30000);
page.on('pageerror',e=>errors.push(String(e)));page.on('websocket',()=>errors.push('Game opened a WebSocket'));page.on('request',r=>requests.push(r.url()));
async function enter(){
 const submit=page.locator('#loading-name button[type=submit]');
 await submit.waitFor({state:'visible',timeout:120000});
 await page.waitForFunction(()=>document.getElementById('loading-message')?.textContent.includes('Station ready'),null,{timeout:120000});
 await page.locator('#loading-name input[name=player]').fill('Browser acceptance');await submit.click();
 await page.waitForFunction(()=>!document.body.classList.contains('is-loading'),null,{timeout:120000});
 await page.waitForFunction(()=>window.kyotoState?.ready,null,{timeout:10000});
 if(await page.locator('#tutorial-hide').isVisible())await page.locator('#tutorial-hide').click();
 if(await page.evaluate(()=>kyotoState.briefing))await page.locator('#briefing-play').click();
 await page.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition);
}
async function begin(hold){
 await page.locator('#game').focus();await page.keyboard.press('h');await page.keyboard.down('Space');
 await page.waitForFunction(()=>kyotoState.charging,null,{timeout:5000});await page.waitForTimeout(hold);await page.keyboard.up('Space');
 await page.waitForFunction(()=>kyotoState.phase==='Flight',null,{timeout:10000});
}
try{
 await page.goto(origin+'/level/atrium-welcome');await enter();console.log('Loaded browser-only station');
 const before=await page.evaluate(()=>kyotoState.feet);
 await page.locator('#game').focus();await page.keyboard.down('KeyW');await page.waitForTimeout(500);await page.keyboard.up('KeyW');await page.waitForTimeout(100);
 const moved=await page.evaluate(()=>kyotoState.feet);assert.ok(Math.hypot(moved.x-before.x,moved.z-before.z)>.3,'Walking moves the robot');assert.ok(Math.abs(moved.y-before.y)<.02,'Walking stays grounded');
 await page.locator('#home').click();await page.waitForTimeout(200);
 const home=await page.evaluate(()=>kyotoState.feet);assert.ok(Math.hypot(home.x-before.x,home.z-before.z)<.01);
 // Offline after assets load: controls, physics, scores and replay must remain
 // functional. No API request is allowed during any gameplay operation below.
 await context.setOffline(true);const offlineStart=requests.length;
 await begin(2250);await page.keyboard.press('Enter');await page.waitForFunction(()=>kyotoState.phase==='Result'&&kyotoState.result);
 let state=await page.evaluate(()=>kyotoState);assert.equal(state.result.challenge.id,'atrium-welcome');assert.ok(state.result.success);assert.equal(state.result.waypointHits.length,1);assert.ok(state.diagnostics.sleeping);assert.equal(Math.hypot(...Object.values(state.velocity)),0);assert.equal(Math.hypot(...Object.values(state.spin)),0);assert.equal(state.pointerLocked,false);results.push(state.result);
 await page.waitForTimeout(900);await page.screenshot({path:out+'/first-bounce.png'});
 await page.locator('#watch-result').click();await page.waitForFunction(()=>kyotoState.mode==='replay');
 if(await page.locator('#replay-play').textContent()==='Pause')await page.locator('#replay-play').click();
 await page.locator('#replay-scrub').focus();await page.keyboard.press('End');await page.waitForFunction(t=>Math.abs(kyotoState.replayTime-t)<.02,state.result.duration);
 await page.keyboard.press('Home');await page.waitForFunction(()=>kyotoState.replayTime<=0);await page.locator('#close-replay').click();
 await page.locator('#next-challenge').click();await page.waitForFunction(()=>kyotoState.challenge?.id==='atrium-clock-in');
 if(await page.evaluate(()=>kyotoState.briefing))await page.locator('#briefing-play').click();await page.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition);
 // Recall after computation has already finished but playback is still flying.
 await begin(2900);await page.waitForTimeout(600);await page.keyboard.press('r');await page.waitForFunction(()=>kyotoState.phase==='Aim');
 assert.equal((await page.evaluate(()=>kyotoState.board)).length,0,'Recalled provisional result is not banked');
 await begin(2900);await page.locator('#shot-skip').click();await page.waitForFunction(()=>kyotoState.phase==='Result'&&kyotoState.result);
 state=await page.evaluate(()=>kyotoState);assert.ok(state.result.success);assert.equal(state.result.waypointHits.length,2);assert.equal(Math.hypot(...Object.values(state.velocity)),0);assert.equal(Math.hypot(...Object.values(state.spin)),0);results.push(state.result);
 await page.waitForTimeout(900);await page.screenshot({path:out+'/clock-in.png'});
 await page.waitForFunction(()=>kyotoState.board.length===1);assert.deepEqual(requests.slice(offlineStart).filter(url=>!new URL(url).pathname.startsWith('/favicon.')),[],'No gameplay network dependency; browser favicon retries are decorative');
 console.log('Both offline levels, recall and replay passed');await context.setOffline(false);await page.reload();await enter();
 await page.waitForFunction(()=>kyotoState.challenge?.id==='atrium-clock-in'&&kyotoState.board.length===1);
 assert.equal((await page.evaluate(()=>kyotoState.board[0].attempt)),results[1].attempt,'Reload retains the score');
 await context.setOffline(true);
 await page.locator('#result-leaderboard ol button').first().click();await page.waitForFunction(()=>kyotoState.mode==='replay');
 await page.locator('#close-replay').click();await page.setViewportSize({width:390,height:664});
 await page.locator('#game').focus();await page.keyboard.press('r');await page.waitForFunction(()=>kyotoState.phase==='Aim');
 await page.keyboard.press('h');await page.locator('#mobile-throw').waitFor({state:'visible'});
 // Touch emulation belongs to this headless tab and does not use the desktop
 // pointer. Exercise the actual pointer capture/hold/release handlers.
 const touch=await context.newCDPSession(page);await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 const box=await page.locator('#mobile-throw').boundingBox();
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});
 await page.waitForFunction(()=>kyotoState.charging);await page.waitForTimeout(2900);
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>kyotoState.phase==='Flight');await page.locator('#mobile-skip').click();await page.waitForFunction(()=>kyotoState.phase==='Result'&&kyotoState.result);
 state=await page.evaluate(()=>kyotoState);assert.ok(state.result.success);assert.equal(state.result.waypointHits.length,2);assert.equal(state.pointerLocked,false);
 await page.waitForTimeout(900);await page.screenshot({path:out+'/mobile-clock-in.png'});
 // Let one full flight play normally: compute-ahead must not bank early, stall
 // the renderer, or drop the music clock. Measure the real station at 1280x800.
 await page.setViewportSize({width:1280,height:800});await page.locator('#game').focus();await page.keyboard.press('r');await page.waitForFunction(()=>kyotoState.phase==='Aim');
 await page.evaluate(()=>{
  window.bench={frames:[],longTasks:[],running:true,audioStart:null};let last=performance.now();
  new PerformanceObserver(list=>{if(kyotoState.phase==='Flight')bench.longTasks.push(...list.getEntries().map(e=>e.duration));}).observe({type:'longtask'});
  function sample(now){if(kyotoState.phase==='Flight'){bench.frames.push(now-last);bench.audioStart??={...kyotoState.audio};}last=now;if(bench.running)requestAnimationFrame(sample);}requestAnimationFrame(sample);
 });
 await begin(2900);await page.waitForFunction(()=>kyotoState.phase==='Result'&&kyotoState.result,null,{timeout:60000});
 benchmark=await page.evaluate(()=>{bench.running=false;return {...bench,audioEnd:kyotoState.audio};});
 const frames=benchmark.frames.slice().sort((a,b)=>a-b);benchmark={...benchmark,frames:frames.length,meanFps:1000/(frames.reduce((a,b)=>a+b,0)/frames.length),p95FrameMs:frames[Math.floor(frames.length*.95)],maxFrameMs:frames.at(-1)};
 assert.ok(benchmark.frames>300,'Measured normal playback rather than an early result');assert.equal(benchmark.audioEnd.status,'running');assert.equal(benchmark.audioEnd.skippedMusicSteps,benchmark.audioStart.skippedMusicSteps,'Music clock must not drop beats during flight');
 // Re-simulate real, persisted UI shots in Node using only their launch inputs.
 // This checks that the worker session and replay storage preserve every pose.
 const replays=await page.evaluate(async ids=>{
  const {localStore}=await import('/local-store.js'),store=await localStore();
  try{return await Promise.all(ids.map(id=>store.replay(id)));}finally{store.close();}
 },results.map(r=>r.attempt));
 const world=new StaticWorld(decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin')));
 for(const replay of replays){
  const shot=new Shot(world,replay.challenge,{position:replay.launchPosition,velocity:replay.velocity,spin:replay.spin},{attempt:replay.attempt,releaseTime:replay.releaseTime,chargeTime:replay.chargeTime,thrower:replay.thrower});
  while(!shot.done&&shot.steps<180*120)shot.step();assert.ok(shot.done);
  const verified=shot.result();for(const key of ['poses','contacts','waypointHits','breakdown','score','success','duration'])assert.deepEqual(verified[key],replay[key],`Stored ${key} must reproduce from launch inputs`);
 }world.free();
 assert.deepEqual(errors,[]);console.log('PASS browser-only game: walking, home, both levels, offline Skip, recall forfeiture, replay seeking, durable local score, touch hold/release and mobile Skip');
}catch(error){
 await page.screenshot({path:out+'/failure.png'});await writeFile(out+'/failure.json',JSON.stringify({error:String(error),errors,state:await page.evaluate(()=>window.kyotoState)},null,2));throw error;
}finally{await writeFile(out+'/receipt.json',JSON.stringify({results,errors,benchmark},null,2));await browser.close();if(benchmark)console.log(JSON.stringify(benchmark));}
