import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {staticPreview} from '../static-preview.mjs';
import {launchTestBrowser,testBrowserName} from './browser-engine.mjs';
import {backgroundInput} from './background-input.mjs';
import {silentOutput} from './browser-game-input.mjs';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
import {ShotVerification} from '../verification.mjs';

assert.equal(testBrowserName,'chrome','Native multi-touch acceptance uses Chrome CDP');
const out='.local/browser-release-test/controls';await mkdir(out,{recursive:true});
for(const name of ['receipt.json','failure.json','failure.png'])await rm(out+'/'+name,{force:true});
const server=await staticPreview('.local/browser-release');await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser,context,page,touch,stage='startup',passed=false,metrics,recorded,result;
const errors=[],requests=[],checks=[];
try{
 browser=await launchTestBrowser({render:true});context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 await backgroundInput(context);await silentOutput(context);
 await context.addInitScript(()=>{
  const data=window.controls={stage:'startup',markers:[],slowFrames:[],audioChanges:[],longTasks:[],commands:[],worker:[],pointers:[],frames:{}};let state,last=performance.now(),audio={};
  for(const type of ['pointerdown','pointerup','pointercancel','click'])document.addEventListener(type,e=>{data.pointers.push({at:performance.now(),stage:data.stage,type,id:e.pointerId,primary:e.isPrimary,target:e.target.closest('[id]')?.id});if(data.pointers.length>100)data.pointers.shift();},true);
  Object.defineProperty(window,'kyotoState',{get:()=>state,set:value=>{
   state=value;const now=performance.now(),ms=now-last;last=now;
   const group=data.frames[data.stage]??={count:0,totalMs:0,maxMs:0};group.count++;group.totalMs+=ms;group.maxMs=Math.max(group.maxMs,ms);
   if(ms>50){data.slowFrames.push({at:now,stage:data.stage,ms,phase:value.phase,course:value.challenge?.id});if(data.slowFrames.length>200)data.slowFrames.shift();}
   if(value.audio&&(value.audio.skippedMusicSteps!==audio.skippedMusicSteps||value.audio.schedulerGapMaxMs>audio.schedulerGapMaxMs)){
    data.audioChanges.push({at:now,stage:data.stage,...value.audio});if(data.audioChanges.length>100)data.audioChanges.shift();
   }audio=value.audio||{};
  }});
  if(PerformanceObserver.supportedEntryTypes.includes('longtask'))new PerformanceObserver(list=>{
   for(const e of list.getEntries())data.longTasks.push({at:e.startTime,ms:e.duration,stage:data.markers.findLast(m=>m.at<=e.startTime)?.stage||'startup'});
   if(data.longTasks.length>200)data.longTasks.splice(0,data.longTasks.length-200);
  }).observe({type:'longtask'});
  const NativeWorker=Worker;
  window.Worker=class extends NativeWorker{
   constructor(...args){super(...args);this.addEventListener('message',e=>{const m=e.data;if(['session','local-result','recording-error','error'].includes(m.type)){data.worker.push({at:performance.now(),stage:data.stage,type:m.type,attempt:m.attempt??m.result?.attempt,score:m.result?.score,message:m.message});if(data.worker.length>50)data.worker.shift();}});}
   postMessage(m,...args){
    if(['input','charge','release','cancel','recall','skip-shot','bank-result'].includes(m.type)){
     const text=JSON.stringify(m);if(text!==this.lastCommand){data.commands.push({at:performance.now(),stage:data.stage,...m});if(data.commands.length>500)data.commands.shift();this.lastCommand=text;}
    }return super.postMessage(m,...args);
   }
  };
 });
 page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push(String(e)));page.on('websocket',()=>errors.push('Unexpected gameplay WebSocket'));page.on('request',r=>requests.push(r.url()));
 touch=await context.newCDPSession(page);await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 const points=new Map(),dispatch=type=>touch.send('Input.dispatchTouchEvent',{type,touchPoints:[...points.values()]});
 const down=async(id,p)=>{points.set(id,{id,...p});await dispatch('touchStart');};
 const move=async(id,p)=>{assert(points.has(id));points.set(id,{id,...p});await dispatch('touchMove');};
 // Chrome ends the listed contacts on touchEnd. Omitting a contact from a
 // touchMove does not release it. Verify the actual pointer-up in the trace.
 const up=async id=>{const p=points.get(id);assert(p);points.delete(id);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[p]});};
 const cancel=async()=>{points.clear();await dispatch('touchCancel');};
 async function center(selector){const el=page.locator(selector);await el.waitFor({state:'visible'});await el.scrollIntoViewIfNeeded();const r=await el.boundingBox();assert(r);return {x:r.x+r.width/2,y:r.y+r.height/2};}
 async function tap(selector,id=9){await down(id,await center(selector));await up(id);}
 async function mark(name){stage=name;await page.evaluate(name=>{controls.stage=name;controls.markers.push({stage:name,at:performance.now()});},name);console.log(name);}
 async function state(){return page.evaluate(()=>kyotoState);}
 async function scenePoint(){
  return page.evaluate(()=>{
   const r=document.querySelector(kyotoState.mode==='replay'?'#replay-stage':'#mobile-stage').getBoundingClientRect();
   for(const fy of [.5,.3,.7])for(const fx of [.5,.3,.7]){const p={x:r.x+r.width*fx,y:r.y+r.height*fy};if(document.elementFromPoint(p.x,p.y)?.id==='game')return p;}
   throw Error('No unobstructed touch point in the visible station');
  });
 }
 async function home(){await tap('#mobile-settings');await tap('#home');await tap('#mobile-close');await page.waitForFunction(()=>Math.hypot(kyotoState.feet.x-kyotoState.challenge.start.center.x,kyotoState.feet.z-kyotoState.challenge.start.center.z)<.01);}
 async function dragRange(selector,fraction){const el=page.locator(selector);await el.scrollIntoViewIfNeeded();const r=await el.boundingBox(),y=r.y+r.height/2;await down(1,{x:r.x+r.width/2,y});await move(1,{x:r.x+12+(r.width-24)*fraction,y});await up(1);}
 await page.goto(origin+'/level/atrium-welcome');await page.waitForFunction(()=>document.getElementById('loading-message')?.textContent.includes('Station ready'),null,{timeout:120000});
 await page.locator('#loading-name input[name=player]').fill('Touch acceptance');await page.keyboard.press('Enter');
 await page.waitForFunction(()=>!document.body.classList.contains('is-loading')&&window.kyotoState?.ready,null,{timeout:120000});
 if(await page.locator('#tutorial-hide').isVisible())await tap('#tutorial-hide');
 await context.setOffline(true);const offlineStart=requests.length;

 await mark('joystick dead zone, walking and release');
 const initial=(await state()).feet,stick=await center('#mobile-move');
 await down(1,stick);await move(1,{x:stick.x+2,y:stick.y-2});await page.waitForTimeout(200);await up(1);
 assert(Math.hypot((await state()).feet.x-initial.x,(await state()).feet.z-initial.z)<.03);
 await down(1,stick);await move(1,{x:stick.x,y:stick.y-49});
 await page.waitForFunction(p=>Math.hypot(kyotoState.feet.x-p.x,kyotoState.feet.z-p.z)>.6,initial);await up(1);
 await page.waitForFunction(()=>controls.commands.findLast(m=>m.type==='input')?.z===0);await page.waitForTimeout(100);const stopped=(await state()).feet;
 await page.waitForTimeout(200);assert(Math.hypot((await state()).feet.x-stopped.x,(await state()).feet.z-stopped.z)<.03);
 assert(await page.evaluate(()=>controls.commands.some(m=>m.stage==='joystick dead zone, walking and release'&&m.type==='input'&&m.z>.9&&m.fast)));
 checks.push('native joystick dead zone, fast walking, release stops movement');await home();
 // Retain a real touch movement in the route used by the later replay proof.
 const returned=(await state()).feet,side=await center('#mobile-move');await down(1,side);await move(1,{x:side.x+30,y:side.y});
 await page.waitForFunction(p=>Math.hypot(kyotoState.feet.x-p.x,kyotoState.feet.z-p.z)>.3,returned);await up(1);

 await mark('aim drag and spin sliders');
 const aim=await state(),p=await scenePoint();await down(1,p);await move(1,{x:p.x+30,y:p.y-18});await up(1);
 await page.waitForFunction(a=>Math.abs(kyotoState.pitch-a.pitch)>2,aim);assert(Math.abs((await state()).yaw-aim.yaw)>5);
 await tap('#mobile-settings');await dragRange('#top',.6);await dragRange('#kick',.45);await tap('#mobile-close');
 await page.waitForFunction(()=>kyotoState.top>=20&&kyotoState.kick<=-10);const spin=await state();
 await tap('#power-full');assert.equal(await page.locator('#power-full').getAttribute('aria-pressed'),'true');await tap('#power-precision');
 checks.push('native aim drag, top/backspin and kick sliders, power range selection');

 await mark('charging cancel and cancelled pointer');
 await down(1,await center('#mobile-throw'));await page.waitForFunction(()=>kyotoState.charging);await cancel();
 await page.waitForFunction(()=>!kyotoState.charging&&kyotoState.phase==='Aim');
 await down(1,await center('#mobile-throw'));await page.waitForFunction(()=>kyotoState.charging);await tap('#mobile-cancel',2);
 await page.waitForFunction(()=>!kyotoState.charging&&kyotoState.phase==='Aim',null,{timeout:3000});await up(1);
 await page.waitForFunction(()=>!kyotoState.charging&&kyotoState.phase==='Aim');
 await down(1,await center('#mobile-throw'));await page.waitForFunction(()=>kyotoState.charging);await page.locator('#mobile-cancel').focus();await page.keyboard.press('Enter');await up(1);
 await page.waitForFunction(()=>!kyotoState.charging&&kyotoState.phase==='Aim');
 assert.equal(await page.evaluate(()=>controls.commands.filter(m=>m.type==='release').length),0,'Cancelled fingers never release a shot');
 checks.push('native pointercancel, second-finger Cancel and keyboard activation discard charging without throwing');

 await mark('second finger aims while first finger charges');
 await down(1,await center('#mobile-throw'));await page.waitForFunction(()=>kyotoState.charging);const charging=await state(),q=await scenePoint();
 await down(2,q);await move(2,{x:q.x+20,y:q.y-10});await up(2);
 await page.waitForFunction(a=>kyotoState.charging&&Math.abs(kyotoState.pitch-a.pitch)>1,charging);
 assert.equal(await page.evaluate(()=>controls.commands.filter(m=>m.type==='release').length),0,'Lifting the aiming finger does not throw');
 await page.waitForTimeout(1100);await up(1);await page.waitForFunction(()=>kyotoState.phase==='Flight');
 assert.equal(await page.evaluate(()=>controls.commands.filter(m=>m.type==='release').length),1,'Only the charging finger releases');
 await tap('#mobile-speed');await page.waitForFunction(()=>kyotoState.audio.playbackRate===2);await tap('#mobile-speed');await page.waitForFunction(()=>kyotoState.audio.playbackRate===1);
 await tap('#mobile-skip');await page.waitForFunction(()=>kyotoState.phase==='Result'&&kyotoState.result);
 result=(await state()).result;assert(result.score>0);assert.equal(result.thrower.top,spin.top);assert.equal(result.thrower.kick,spin.kick);
 assert.equal(Math.hypot(...Object.values((await state()).velocity)),0);assert.equal(Math.hypot(...Object.values((await state()).spin)),0);
 await page.waitForFunction(id=>kyotoState.board.some(r=>r.attempt===id),result.attempt);
 checks.push('second-finger aim preserves charge ownership; spin reaches physics; speed toggle and Skip finish at full rest');

 await mark('touch replay pause, seek, orbit and pinch');
 await tap('#watch-result');await page.waitForFunction(()=>kyotoState.mode==='replay');await tap('#replay-play');
 const paused=(await state()).replayTime;await page.waitForTimeout(200);assert.equal((await state()).replayTime,paused);
 await dragRange('#replay-scrub',.5);await page.waitForFunction(t=>kyotoState.replayTime>t*.3&&kyotoState.replayTime<t*.7,result.duration);
 // Orbit above the floor before measuring zoom: a camera blocked against the
 // ground legitimately has zero clearance regardless of its requested distance.
 const orbit=await state(),r=await scenePoint();await down(1,r);await move(1,{x:r.x+24,y:r.y+100});await up(1);
 await page.waitForFunction(a=>kyotoState.camera.manual&&Math.abs(kyotoState.camera.azimuth-a)>.05&&kyotoState.cameraClearance>.5,orbit.camera.azimuth);
 const zoom=(await state()).camera.distance;
 await down(1,{x:r.x-25,y:r.y});await down(2,{x:r.x+25,y:r.y});await move(1,{x:r.x-60,y:r.y});await move(2,{x:r.x+60,y:r.y});await up(2);await up(1);
 // Requested zoom is distinct from collision-limited, eased camera clearance.
 await page.waitForFunction(z=>kyotoState.camera.distance<z*.8,zoom);
 assert(Math.abs((await state()).camera.distance-zoom*50/120)<.001);
 await tap('#replay-recenter');await page.waitForFunction(()=>!kyotoState.camera.manual);
 checks.push('native replay pause, scrub, orbit, pinch and recenter');

 await mark('scout vertical movement and return');
 await tap('#replay-free');await page.waitForFunction(()=>kyotoState.camera.mode==='fly');const fly=(await state()).camera.position;
 await down(1,await center('#mobile-up'));await page.waitForFunction(y=>kyotoState.camera.position[1]>y+.5,fly[1]);await up(1);
 await tap('#mobile-boost');assert.equal(await page.locator('#mobile-boost').getAttribute('aria-pressed'),'true');
 await tap('#replay-recenter');await page.waitForFunction(()=>kyotoState.camera.mode!=='fly');await tap('#close-replay');await page.waitForFunction(()=>kyotoState.mode==='play');
 checks.push('native scout height/boost and return to replay/game');

 await mark('recall forfeits and orientation clears held controls');
 await page.locator('#game').focus();await page.keyboard.press('r');await page.waitForFunction(()=>kyotoState.phase==='Aim');
 const beforeRecall=(await state()).board.map(r=>r.attempt);
 await down(1,await center('#mobile-throw'));await page.waitForTimeout(500);await up(1);await page.waitForFunction(()=>kyotoState.phase==='Flight');
 await tap('#mobile-recall');await page.waitForFunction(()=>kyotoState.phase==='Aim');assert.deepEqual((await state()).board.map(r=>r.attempt),beforeRecall);
 await down(1,await center('#mobile-throw'));await page.waitForFunction(()=>kyotoState.charging);
 await page.setViewportSize({width:844,height:390});
 await touch.send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:false,screenOrientation:{type:'landscapePrimary',angle:90}});
 await page.waitForFunction(()=>!kyotoState.charging&&kyotoState.phase==='Aim');await up(1);
 assert.deepEqual(await page.evaluate(()=>[innerWidth,innerHeight,screen.orientation.angle]),[844,390,90]);
 await page.waitForTimeout(200);assert.equal((await state()).phase,'Aim');
 const landscape=await center('#mobile-move'),feet=(await state()).feet;await down(1,landscape);await move(1,{x:landscape.x+38,y:landscape.y});
 await page.waitForFunction(p=>Math.hypot(kyotoState.feet.x-p.x,kyotoState.feet.z-p.z)>.3,feet);await up(1);
 await page.screenshot({path:out+'/landscape.png'});checks.push('recall preserves prior records; real orientation cancels charge; landscape joystick works');

 await mark('desktop keyboard controls after touch');
 await touch.send('Emulation.clearDeviceMetricsOverride');await touch.send('Emulation.setTouchEmulationEnabled',{enabled:false});await page.setViewportSize({width:1280,height:800});
 await page.waitForFunction(()=>!document.body.classList.contains('mobile-ui'));await page.locator('#home').click();await page.locator('#game').focus();
 const desktop=(await state()).feet;await page.keyboard.down('KeyA');try{await page.waitForFunction(p=>Math.hypot(kyotoState.feet.x-p.x,kyotoState.feet.z-p.z)>.3,desktop);}finally{await page.keyboard.up('KeyA');}
 await page.keyboard.press('x');await page.waitForFunction(()=>kyotoState.top===0&&kyotoState.kick===0);await page.keyboard.down('Space');await page.waitForFunction(()=>kyotoState.charging);await page.keyboard.press('Escape');await page.keyboard.up('Space');await page.waitForFunction(()=>kyotoState.phase==='Aim');
 checks.push('desktop keyboard walking, clear spin and cancel after touch/viewport transitions');
 assert.equal((await state()).pointerLocked,false);assert.deepEqual(errors,[]);
 assert.deepEqual(requests.slice(offlineStart).filter(url=>!new URL(url).pathname.startsWith('/favicon.')),[],'Every interaction after load is offline');
 recorded=await page.evaluate(async attempt=>{
  const store=await(await import('/local-store.js')).localStore();try{const commands=[];for await(const chunk of store.inputChunks(attempt))commands.push(...chunk.runs);return {replay:await store.replay(attempt),proof:await store.inputProof(attempt),commands};}finally{store.close();}
 },result.attempt);
 assert(recorded.commands.some(r=>r.x!==0||r.z!==0),'The verified recording includes actual touch walking');
 const catalog=JSON.parse(await readFile('web/starter-challenges.json')),world=new StaticWorld(decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin')));
 try{
  const {replay,proof,commands}=recorded,course={...catalog.find(c=>c.id===proof.header.courseId),physics:BROWSER_PHYSICS},job=new ShotVerification(world,course,proof.header,commands,{attempt:replay.attempt,subject:replay.id}),poses=[],contacts=[];let reply;
  do{reply=await job.advance();if(reply.recording){poses.push(...reply.recording.poses);contacts.push(...reply.recording.contacts);}assert((job.shot?.steps||0)<180*240);}while(reply.status!=='verified');
  const verified={...reply.result,poses,contacts};for(const key of ['poses','contacts','waypointHits','breakdown','score','success','duration','launchPosition','velocity','spin','thrower','chargeTime','releaseTime'])assert.deepEqual(verified[key],replay[key],`Touch replay ${key} must reconstruct from legal controls`);
 }finally{world.free();}
 checks.push('complete touch/spin replay independently reproduces from saved controls');
 metrics=await page.evaluate(()=>controls);await page.screenshot({path:out+'/desktop.png'});passed=true;console.log('PASS native touch and desktop browser-only controls, offline persistence and exact independent replay');
}catch(error){
 const failure={stage,error:String(error),errors};await writeFile(out+'/failure.json',JSON.stringify(failure,null,2));let deadline;
 try{Object.assign(failure,await Promise.race([page.evaluate(()=>({state:window.kyotoState,metrics:window.controls})),new Promise(resolve=>{deadline=setTimeout(()=>resolve({}),2000);})]));}catch{}finally{clearTimeout(deadline);}
 await writeFile(out+'/failure.json',JSON.stringify(failure,null,2));await page?.screenshot({path:out+'/failure.png',timeout:5000}).catch(()=>{});throw error;
}finally{
 await writeFile(out+'/receipt.json',JSON.stringify({passed,stage,browser:browser?.version(),checks,errors,result,metrics},null,2)+'\n');
 await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
