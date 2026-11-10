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
const page=await context.newPage(),errors=[],requests=[],results=[],catalog=JSON.parse(await readFile('web/starter-challenges.json'));let benchmark;page.setDefaultTimeout(30000);
page.on('pageerror',e=>errors.push(String(e)));page.on('websocket',()=>errors.push('Game opened a WebSocket'));page.on('request',r=>requests.push(r.url()));
async function viewport(width,height){
 await page.setViewportSize({width,height});
 // matchMedia change handlers run after setViewportSize resolves. Sending L
 // first can open the old mobile panel just as resize closes it.
 await page.waitForFunction(mobile=>document.body.classList.contains('mobile-ui')===mobile,width<=900);
}
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
 await page.locator('#campaign-chapter').waitFor({state:'hidden'});
}
async function begin(hold){
 await page.locator('#game').focus();await page.keyboard.press('h');
 // Waiting for sampled telemetry after keydown adds one or more render frames
 // to a short charge. Send a real key press with the authored hold duration.
 await page.keyboard.press('Space',{delay:hold});
 await page.waitForFunction(()=>kyotoState.phase==='Flight',null,{timeout:10000});
}
async function select(id){
 const course=catalog.find(c=>c.id===id);
 await page.locator('#game').focus();await page.keyboard.press('l');
 await page.locator('#campaign-chapter').selectOption(String(course.campaign.chapter));
 await page.locator(`#course-list button[data-challenge="${id}"]`).click();
 await page.waitForFunction(id=>kyotoState.challenge?.id===id,id);
 if(await page.evaluate(()=>kyotoState.briefing))await page.locator('#briefing-play').click();
 await page.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition);
 await page.locator('#campaign-chapter').waitFor({state:'hidden'});
 // First Bounce has no automatic overview to wait through. Its selected UI
 // arrives before the replacement physics state, so await actual readiness and
 // placement instead of sampling the transient reset frame.
 await page.waitForFunction(c=>kyotoState.ready&&kyotoState.phase==='Aim'&&kyotoState.challenge?.id===c.id&&Math.hypot(kyotoState.feet.x-c.start.center.x,kyotoState.feet.z-c.start.center.z)<.01,course);
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
 await select('atrium-clock-in');
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
 await page.locator('#close-replay').click();await viewport(390,664);
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
 // Let the moving-escalator course play normally: compute-ahead must not bank early, stall
 // the renderer, or drop the music clock. Measure the real station at 1280x800.
 await touch.send('Emulation.setTouchEmulationEnabled',{enabled:false});await viewport(1280,800);await select('basement-upward-bound');
 await page.evaluate(()=>{
  window.bench={frames:[],longTasks:[],running:true,audioStart:null};let last=performance.now();
  new PerformanceObserver(list=>{if(kyotoState.phase==='Flight')bench.longTasks.push(...list.getEntries().map(e=>e.duration));}).observe({type:'longtask'});
  function sample(now){if(kyotoState.phase==='Flight'){bench.frames.push(now-last);bench.audioStart??={...kyotoState.audio};}last=now;if(bench.running)requestAnimationFrame(sample);}requestAnimationFrame(sample);
 });
 await begin(122);await page.waitForFunction(()=>kyotoState.phase==='Result'&&kyotoState.result,null,{timeout:60000});
 state=await page.evaluate(()=>kyotoState);assert.ok(state.result.success);assert.equal(state.result.waypointHits.length,1);assert.ok(state.diagnostics.sleeping);assert.equal(Math.hypot(...Object.values(state.velocity)),0);assert.equal(Math.hypot(...Object.values(state.spin)),0);results.push(state.result);
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
 // Every authored stage is reachable from the real menu while offline, with
 // its actual target geometry and suggested controls. Full shot feasibility is
 // separately proved for all stages and neighbors by test:browser:campaign.
 for(const width of [1280,390]){
  await viewport(width,width===390?664:800);
  for(const course of catalog){
   await select(course.id);await page.locator('#game').focus();await page.keyboard.press('h');
   await page.waitForFunction(c=>kyotoState.challenge?.id===c.id&&kyotoState.phase==='Aim'&&['yaw','pitch','top','kick'].every(k=>Math.abs(kyotoState[k]-c.hint[k])<.0001),course);
   const state=await page.evaluate(()=>kyotoState);
   assert.equal(state.challenge.name,course.name);assert.equal(state.challenge.revision,course.revision);
   assert.deepEqual(state.challenge.waypoints,course.waypoints);assert.ok(state.ready);
   assert.ok(Math.hypot(state.feet.x-course.start.center.x,state.feet.z-course.start.center.z)<.01,'Selected stage places the robot at its start');
   assert.equal(state.pointerLocked,false);
  }
  console.log(`PASS offline ${width}px menu: all 30 stages, start positions and target geometry`);
 }
 assert.ok(!requests.some(url=>new URL(url).pathname.startsWith('/api/')),'Browser gameplay must never contact the native gameplay API');
 assert.deepEqual(errors,[]);console.log('PASS browser-only game: walking, home, three levels including moving escalator, offline Skip, recall forfeiture, replay seeking, durable local score, touch hold/release, mobile Skip and all 30 course menus');
}catch(error){
 await page.screenshot({path:out+'/failure.png'});await writeFile(out+'/failure.json',JSON.stringify({error:String(error),errors,state:await page.evaluate(()=>window.kyotoState)},null,2));throw error;
}finally{await writeFile(out+'/receipt.json',JSON.stringify({results,errors,benchmark},null,2));await browser.close();if(benchmark)console.log(JSON.stringify(benchmark));}
