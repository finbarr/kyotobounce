import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {launchTestBrowser,testBrowserName} from './browser-engine.mjs';
import {mobileHold,mobileInputKind,silentOutput,activateButton} from './browser-game-input.mjs';
import {backgroundInput} from './background-input.mjs';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
import {ShotVerification} from '../verification.mjs';
import {isTutorial} from '../public/tutorial.js';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4430';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const out=process.env.KYOTO_TEST_OUTPUT||`.local/browser-physics/game-${testBrowserName}`;await mkdir(out,{recursive:true});
for(const name of ['failure.json','failure.png','receipt.json'])await rm(out+'/'+name,{force:true});
const browser=await launchTestBrowser({render:true});
const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});await backgroundInput(context);await silentOutput(context);
await context.addInitScript(()=>{
 const NativeWorker=Worker;window.workerTrace=[];window.recordingTrace={};
 const trace=(direction,m)=>{
  if(!['charge','release','cancel','session','recording-chunk','recording-ack','local-result','recording-error','skip-shot','shot-skipping','recall','recalled','error'].includes(m.type))return;
  const at=performance.now(),attempt=m.attempt??m.result?.attempt;
  if(attempt&&['recording-chunk','recording-ack','local-result'].includes(m.type)){
   const r=recordingTrace[attempt]??={chunks:0,maxAckMs:0,started:at};
   if(m.type==='recording-chunk'){r.chunks++;r.receivedAt=at;r.sequence=m.sequence;r.time=m.recording.poses.at(-1)?.t;}
   if(m.type==='recording-ack'){r.maxAckMs=Math.max(r.maxAckMs,at-r.receivedAt);r.acknowledged=m.sequence;}
   if(m.type==='local-result'){r.completed=true;r.elapsedMs=at-r.started;}
  }
  workerTrace.push({at,direction,type:m.type,attempt,sequence:m.sequence,time:m.recording?.poses.at(-1)?.t,complete:m.playback?.complete,message:m.message});
  if(workerTrace.length>160)workerTrace.shift();
 };
 window.Worker=class extends NativeWorker{
  constructor(...args){super(...args);this.addEventListener('message',event=>trace('received',event.data));}
  postMessage(m,...args){trace('sent',m);return super.postMessage(m,...args);}
 };
});
const page=await context.newPage(),errors=[],requests=[],results=[],catalog=JSON.parse(await readFile('web/starter-challenges.json'));let benchmark;page.setDefaultTimeout(30000);
const movingProof=JSON.parse(await readFile('web/levels/proof-inputs.json')).courses.find(c=>c.id==='basement-upward-bound'),movingTiming=movingProof.neighbors.find(s=>s.period&&s.phase>0);
let frameClock,recordings={},passed=false,profiler;
const profileFlight=process.env.KYOTO_FLIGHT_PROFILE==='1';
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
 const audioStep=await page.evaluate(()=>kyotoState.audio.step);
 await page.waitForFunction(step=>kyotoState.audio.step>step+2,audioStep,{timeout:10000});
 if(await page.locator('#tutorial-hide').isVisible())await page.locator('#tutorial-hide').click();
 if(!isTutorial(await page.evaluate(()=>kyotoState.challenge)))await activateButton(page.locator('#briefing-play'));
 await page.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition);
 await page.locator('#campaign-chapter').waitFor({state:'hidden'});
}
async function begin(hold,timing){
 await page.locator('#game').focus();await page.keyboard.press('h');
 if(timing){
  // Moving treads can legitimately reject a ball arriving at a riser. Wait
  // for an authored release phase using the live clock, then use real keys.
  // This neither resets the escalator nor injects a launch or result.
  await page.waitForFunction(({hold,period,phase})=>{
   const predicted=(kyotoState.stationTime+hold/1000+.12)%period;
   return Math.abs(((predicted-phase+period*1.5)%period)-period*.5)<period/16;
  },{hold,...timing});
 }
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
 // Course metadata arrives before the overview's next sampled state. Wait for
 // the expected button instead of treating a transient false flag as absence.
 if(!isTutorial(course))await activateButton(page.locator('#briefing-play'));
 await page.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition);
 await page.locator('#campaign-chapter').waitFor({state:'hidden'});
 // First Bounce has no automatic overview to wait through. Its selected UI
 // arrives before the replacement physics state, so await actual readiness and
 // placement instead of sampling the transient reset frame.
 await page.waitForFunction(c=>kyotoState.ready&&kyotoState.phase==='Aim'&&kyotoState.challenge?.id===c.id&&Math.hypot(kyotoState.feet.x-c.start.center.x,kyotoState.feet.z-c.start.center.z)<.01,course);
}
try{
 const intervals=await page.evaluate(()=>new Promise(resolve=>{const times=[];let last;function sample(t){if(last!==undefined)times.push(t-last);last=t;if(times.length===120)resolve(times);else requestAnimationFrame(sample);}requestAnimationFrame(sample);}));
 intervals.sort((a,b)=>a-b);frameClock={frames:intervals.length,meanFps:1000/(intervals.reduce((n,t)=>n+t,0)/intervals.length),p95FrameMs:intervals[Math.floor(intervals.length*.95)],maxFrameMs:intervals.at(-1)};
 await page.goto(origin+'/level/atrium-welcome');await enter();console.log('Loaded browser-only station');
 if(process.env.KYOTO_TEST_STATIC){
  const manifest=await (await fetch(origin+'/browser-build.json')).json();
  for(const entry of Object.values(manifest.files))for(const part of entry.parts||[])assert(requests.includes(origin+part.url),'Real game downloaded each packaged station/collision chunk');
  for(const path of ['/station.collision.bin','/assets/runtime/atrium.glb'])assert(!requests.includes(origin+path),'No fallback to the original oversized file');
 }
 const before=await page.evaluate(()=>kyotoState.feet);
 await page.locator('#game').focus();await page.keyboard.down('KeyW');
 try{await page.waitForFunction(p=>Math.hypot(kyotoState.feet.x-p.x,kyotoState.feet.z-p.z)>.3,before,{timeout:3000});}
 finally{await page.keyboard.up('KeyW');}
 const moved=await page.evaluate(()=>kyotoState.feet);assert.ok(Math.hypot(moved.x-before.x,moved.z-before.z)>.3,'Walking moves the robot');assert.ok(Math.abs(moved.y-before.y)<.02,'Walking stays grounded');
 await page.locator('#home').click();await page.waitForFunction(p=>Math.hypot(kyotoState.feet.x-p.x,kyotoState.feet.z-p.z)<.01,before);
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
 await page.keyboard.press('Home');await page.waitForFunction(()=>kyotoState.replayTime<=0);await activateButton(page.locator('#close-replay'));
 await select('atrium-clock-in');
 // Recall after computation has already finished but playback is still flying.
 await begin(2900);await page.waitForTimeout(600);await page.keyboard.press('r');await page.waitForFunction(()=>kyotoState.phase==='Aim');
 assert.equal((await page.evaluate(()=>kyotoState.board)).length,0,'Recalled provisional result is not banked');
 await begin(2900);await page.locator('#shot-skip').click();await page.waitForFunction(()=>kyotoState.phase==='Result'&&kyotoState.result);
 state=await page.evaluate(()=>kyotoState);assert.ok(state.result.success);assert.equal(state.result.waypointHits.length,2);assert.equal(Math.hypot(...Object.values(state.velocity)),0);assert.equal(Math.hypot(...Object.values(state.spin)),0);results.push(state.result);
 await page.waitForTimeout(900);await page.screenshot({path:out+'/clock-in.png'});
 await page.waitForFunction(()=>kyotoState.board.length===1);assert.deepEqual(requests.slice(offlineStart).filter(url=>!new URL(url).pathname.startsWith('/favicon.')),[],'No gameplay network dependency; browser favicon retries are decorative');
 recordings=await page.evaluate(()=>recordingTrace);
 console.log('Both offline levels, recall and replay passed');await context.setOffline(false);await page.reload();await enter();
 await page.waitForFunction(()=>kyotoState.challenge?.id==='atrium-clock-in'&&kyotoState.board.length===1);
 assert.equal((await page.evaluate(()=>kyotoState.board[0].attempt)),results[1].attempt,'Reload retains the score');
 await context.setOffline(true);
 await page.locator('#result-leaderboard ol button').first().click();await page.waitForFunction(()=>kyotoState.mode==='replay');
 await activateButton(page.locator('#close-replay'));await viewport(390,664);
 // Exercise repeated real holds and Skip both immediately and after playback
 // begins. A prior intermittent failure stopped early in playback.
 for(const delay of [0,0,600]){
  await page.locator('#game').focus();await page.keyboard.press('r');await page.waitForFunction(()=>kyotoState.phase==='Aim');
  await page.keyboard.press('h');await mobileHold(page,2900);
  await page.waitForFunction(()=>kyotoState.phase==='Flight');if(delay)await page.waitForTimeout(delay);
  await page.locator('#mobile-skip').click();await page.waitForFunction(()=>kyotoState.phase==='Result'&&kyotoState.result);
  state=await page.evaluate(()=>kyotoState);assert.ok(state.result.success);assert.equal(state.result.waypointHits.length,2);assert.equal(state.pointerLocked,false);results.push(state.result);
  await page.waitForFunction(id=>kyotoState.board.some(r=>r.attempt===id),state.result.attempt);
 }
 await page.waitForTimeout(900);await page.screenshot({path:out+'/mobile-clock-in.png'});
 // Let the moving-escalator course play normally: compute-ahead must not bank early, stall
 // the renderer, or drop the music clock. Measure the real station at 1280x800.
 await viewport(1280,800);await select('basement-upward-bound');
 if(profileFlight){
  assert.equal(testBrowserName,'chrome','Flight profiling uses Chrome DevTools');
  profiler=await context.newCDPSession(page);await profiler.send('Profiler.enable');await profiler.send('Profiler.setSamplingInterval',{interval:1000});await profiler.send('Performance.enable');
  await profiler.send('Profiler.start');
 }
 await page.evaluate(()=>{
  const longTasksSupported=PerformanceObserver.supportedEntryTypes.includes('longtask');
  window.bench={frames:[],costs:[],longFrames:[],longTasks:longTasksSupported?[]:null,running:true,audioStart:null};let last=performance.now();
  if(longTasksSupported)new PerformanceObserver(list=>{if(bench.running&&kyotoState.phase==='Flight')bench.longTasks.push(...list.getEntries().map(e=>e.duration));}).observe({type:'longtask'});
  if(PerformanceObserver.supportedEntryTypes.includes('long-animation-frame'))new PerformanceObserver(list=>{if(bench.running)bench.longFrames.push(...list.getEntries().map(e=>e.toJSON()));}).observe({type:'long-animation-frame'});
  function sample(now){if(kyotoState.phase==='Flight'){bench.frames.push(now-last);bench.costs.push({at:now,ms:now-last,...kyotoArt.frameCost,culledObjects:kyotoArt.renderCulling?.skippedObjects,testedGroups:kyotoArt.renderCulling?.tested,calls:kyotoState.render.calls,triangles:kyotoState.render.triangles,pixelRatio:kyotoState.render.pixelRatio,heap:performance.memory?.usedJSHeapSize,workerComplete:!!Object.values(recordingTrace).at(-1)?.completed,flightTime:kyotoState.flightTime});bench.audioStart??={...kyotoState.audio};}last=now;if(bench.running)requestAnimationFrame(sample);}requestAnimationFrame(sample);
 });
 await begin(movingProof.shot.holdMs,movingTiming);await page.waitForFunction(()=>kyotoState.phase==='Result'&&kyotoState.result,null,{timeout:90000});
 // Real keyboard timing varies by milliseconds. A tread can legally reject
 // that launch: the saved inputs must reproduce the outcome, including misses.
 // All 30 exact authored solutions still must clear in test:browser:campaign.
 state=await page.evaluate(()=>kyotoState);assert.equal(state.result.challenge.id,movingProof.id);assert.ok(state.diagnostics.sleeping);assert.equal(state.diagnostics.contactBudgetExhaustions,0);assert.equal(Math.hypot(...Object.values(state.velocity)),0);assert.equal(Math.hypot(...Object.values(state.spin)),0);results.push(state.result);
 benchmark=await page.evaluate(()=>{bench.running=false;return {...bench,audioEnd:kyotoState.audio};});
 if(profiler){
  const {profile}=await profiler.send('Profiler.stop');await writeFile(out+'/flight-cpu-profile.json',JSON.stringify(profile)+'\n');
  benchmark.chromeMetrics=(await profiler.send('Performance.getMetrics')).metrics;await profiler.detach();profiler=null;
 }
 benchmark.releasePhase=state.result.releaseTime%movingTiming.period;
 const frames=benchmark.frames.slice().sort((a,b)=>a-b);benchmark={...benchmark,frames:frames.length,meanFps:1000/(frames.reduce((a,b)=>a+b,0)/frames.length),p95FrameMs:frames[Math.floor(frames.length*.95)],maxFrameMs:frames.at(-1)};
 assert.ok(benchmark.frames>300,'Measured normal playback rather than an early result');assert.equal(benchmark.audioEnd.status,'running');assert.equal(benchmark.audioEnd.skippedMusicSteps,benchmark.audioStart.skippedMusicSteps,'Music clock must not drop beats during flight');
 assert.ok(benchmark.audioEnd.step-benchmark.audioStart.step>frames.reduce((a,b)=>a+b,0)/1000*(112/60*2)*.9,'Real music clock must advance at the intended tempo throughout flight');
 console.log(`PASS ${testBrowserName} normal escalator playback: ${benchmark.meanFps.toFixed(2)} FPS, no skipped music beats`);
 // Resolve the course from the authoritative catalog, then reconstruct walking
 // and throwing from saved controls. No client trajectory or launch is trusted.
 await page.waitForFunction(id=>kyotoState.board.some(r=>r.attempt===id),results.at(-1).attempt);
 const replays=await page.evaluate(async ids=>{
  const {localStore}=await import('/local-store.js'),store=await localStore();
  try{return await Promise.all(ids.map(async id=>{const commands=[];for await(const chunk of store.inputChunks(id))commands.push(...chunk.runs);return {replay:await store.replay(id),proof:await store.inputProof(id),commands};}));}finally{store.close();}
 },results.map(r=>r.attempt));
 const world=new StaticWorld(decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin')));
 const movingReplay=replays.find(({replay})=>replay.challenge.id===movingProof.id).replay;
 assert(movingReplay.contacts.some(contact=>world.escalators.some(lane=>lane.id===contact.surface)),'The unskipped benchmark must actually contact a moving escalator');
 for(const {replay,proof,commands} of replays){
  const course={...catalog.find(c=>c.id===proof.header.courseId),physics:BROWSER_PHYSICS},job=new ShotVerification(world,course,proof.header,commands,{attempt:replay.attempt,subject:replay.id}),poses=[],contacts=[];let reply;
  do{reply=await job.advance();if(reply.recording){poses.push(...reply.recording.poses);contacts.push(...reply.recording.contacts);}assert.ok((job.shot?.steps||0)<180*120);}while(reply.status!=='verified');
  const verified={...reply.result,poses,contacts};for(const key of ['poses','contacts','waypointHits','breakdown','score','success','duration','launchPosition','velocity','spin','thrower','chargeTime','releaseTime'])assert.deepEqual(verified[key],replay[key],`Stored ${key} must independently reproduce from walking and throw controls`);
 }world.free();console.log(`PASS ${testBrowserName}: all ${replays.length} saved input recordings independently reproduce exactly`);
 // Every authored stage is reachable from the real menu while offline, with
 // its actual target geometry and suggested controls. Full shot feasibility is
 // separately proved for all stages and neighbors by test:browser:campaign.
 for(const width of [1280,390]){
  await viewport(width,width===390?664:800);
  for(const [index,course]of catalog.entries()){
   console.log(`${testBrowserName} ${width}px opening ${course.id}`);
   await select(course.id);await page.locator('#game').focus();await page.keyboard.press('h');
   await page.waitForFunction(c=>kyotoState.challenge?.id===c.id&&kyotoState.phase==='Aim'&&['yaw','pitch','top','kick'].every(k=>Math.abs(kyotoState[k]-c.hint[k])<.0001),course);
   const state=await page.evaluate(()=>kyotoState);
   assert.equal(state.challenge.name,course.name);assert.equal(state.challenge.revision,course.revision);
   assert.deepEqual(state.challenge.waypoints,course.waypoints);assert.ok(state.ready);
   assert.ok(Math.hypot(state.feet.x-course.start.center.x,state.feet.z-course.start.center.z)<.01,'Selected stage places the robot at its start');
   assert.equal(state.pointerLocked,false);
   if((index+1)%10===0)console.log(`${testBrowserName} ${width}px course menu: ${index+1}/${catalog.length}`);
  }
  console.log(`PASS offline ${width}px menu: all 30 stages, start positions and target geometry`);
 }
 assert.ok(!requests.some(url=>new URL(url).pathname.startsWith('/api/')),'Browser gameplay must never contact the native gameplay API');
 Object.assign(recordings,await page.evaluate(()=>recordingTrace));
 if(process.env.KYOTO_TEST_STATIC){
  const manifest=await (await fetch(origin+'/browser-build.json')).json(),part=manifest.files['web/public/station.collision.bin'].parts[0];
  await context.setOffline(false);await page.route(origin+part.url,route=>route.fulfill({status:404,body:'Missing collision part'}));
  await page.reload();await page.waitForFunction(()=>document.getElementById('loading')?.dataset.phase==='error',null,{timeout:15000});
  assert(await page.locator('#loading-retry').isVisible(),'A failed physics download offers retry instead of waiting forever for connection');
  await page.screenshot({path:out+'/download-retry.png'});
  console.log('PASS missing collision chunk produces a visible retry state');
 }
 assert.deepEqual(errors,[]);passed=true;console.log(`PASS ${testBrowserName} browser-only game: walking, home, three levels including moving escalator, offline Skip, recall forfeiture, replay seeking, durable local score, mobile hold/release (${mobileInputKind}), repeated mobile Skip and all 30 course menus`);
}catch(error){
 // Preserve the actual failed assertion even if the renderer cannot answer a
 // screenshot or evaluate request. Diagnostic capture must not hide it.
 const failure={error:String(error),errors};await writeFile(out+'/failure.json',JSON.stringify(failure,null,2));
 let deadline;
 try{Object.assign(failure,await Promise.race([page.evaluate(()=>({state:window.kyotoState,workerTrace:window.workerTrace,recordingTrace:window.recordingTrace})),new Promise(resolve=>{deadline=setTimeout(()=>resolve({}),2000);})]));}
 catch(captureError){failure.stateError=String(captureError);}finally{clearTimeout(deadline);}
 await writeFile(out+'/failure.json',JSON.stringify(failure,null,2));
 await page.screenshot({path:out+'/failure.png',timeout:5000}).catch(()=>{});throw error;
}finally{if(profiler){try{const {profile}=await profiler.send('Profiler.stop');await writeFile(out+'/flight-cpu-profile.json',JSON.stringify(profile)+'\n');await profiler.detach();}catch{}}await writeFile(out+'/receipt.json',JSON.stringify({passed,engine:testBrowserName,browser:browser.version(),profiling:profileFlight,mobileInputKind,frameClock,results,errors,recordings,benchmark},null,2));await browser.close();if(benchmark){const {costs,longFrames,...summary}=benchmark;console.log(JSON.stringify({frameClock,...summary}));}}
