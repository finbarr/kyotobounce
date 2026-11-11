import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {launchTestBrowser,testBrowserName} from './browser-engine.mjs';
import {mobileHold,mobileInputKind,silentOutput} from './browser-game-input.mjs';
import {backgroundInput} from './background-input.mjs';
import {buildBrowserPhysics} from '../build-physics.mjs';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {Shot} from '../public/physics/shot.js';
import {validateCourse} from '../public/physics/designer.js';
import {isTutorial} from '../public/tutorial.js';
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4430',out=process.env.KYOTO_TEST_OUTPUT||`.local/browser-physics/designer-${testBrowserName}`;assert.equal(new URL(origin).hostname,'127.0.0.1');await mkdir(out,{recursive:true});await buildBrowserPhysics();
for(const name of ['failure.json','failure.png','receipt.json'])await rm(out+'/'+name,{force:true});
const browser=await launchTestBrowser({render:true});
const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});await backgroundInput(context);await silentOutput(context);
await context.addInitScript(()=>{
 const NativeWorker=window.Worker;window.workerMessages=[];
 window.Worker=class extends NativeWorker{constructor(...args){super(...args);if(String(args[0]).includes('physics-worker')){window.physicsWorker=this;this.addEventListener('message',e=>{if(['local-result','error','saved-challenge'].includes(e.data.type))window.workerMessages.push(e.data);});}}};
 // WebKit resolves relative imports in this early injected script against
 // web-inspector://bootstrap.js. Use the actual page origin at call time.
 window.localData=async()=>{const {localStore}=await import(new URL('/local-store.js',location.href).href),store=await localStore();try{return {courses:await store.setting('courses')||[],records:await Promise.all((await store.setting('courses')||[]).map(c=>store.records(c)))};}finally{store.close();}};
});
const page=await context.newPage(),errors=[],requests=[],courses=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(String(e)));page.on('websocket',()=>errors.push('Unexpected WebSocket'));page.on('request',r=>requests.push(r.url()));
async function dismiss(overview=true){if(await page.locator('#tutorial-hide').isVisible())await page.locator('#tutorial-hide').click();if(overview&&!isTutorial(await page.evaluate(()=>kyotoState.challenge)))await page.locator('#briefing-play').click();await page.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition);await page.locator('#campaign-chapter').waitFor({state:'hidden'});}
async function enter(){await page.waitForFunction(()=>document.getElementById('loading-message')?.textContent.includes('Station ready'),null,{timeout:120000});await page.locator('#loading-name input[name=player]').fill('Offline creator');await page.locator('#loading-name button[type=submit]').click();await page.waitForFunction(()=>!document.body.classList.contains('is-loading')&&window.kyotoState?.ready,null,{timeout:120000});await dismiss();}
async function design(edit=false){await page.locator('#game').focus();await page.keyboard.press('l');await page.locator(edit?'#edit-challenge':'#new-challenge').click();await page.waitForFunction(()=>kyotoState.mode==='design'&&kyotoState.phase==='Aim');}
async function throwShot(hold=2250){await page.locator('#game').focus();await page.keyboard.press('Space',{delay:hold});await page.waitForFunction(()=>kyotoState.phase==='Flight');await page.keyboard.press('Enter');}
async function capture(launch=throwShot){await launch();await page.waitForFunction(()=>kyotoState.mode==='editor');const result=await page.evaluate(()=>workerMessages.findLast(m=>m.type==='local-result').result);assert.equal(result.score,0);assert.equal(result.challenge,null);assert.equal(result.design.error,'');assert.ok(result.design.proof);assert.ok(result.design.waypoints.length>0);return result.design;}
async function save(name,revision){await page.locator('#challenge-name').fill(name);await page.locator('#save-challenge').click();await page.waitForFunction(revision=>kyotoState.mode==='play'&&kyotoState.challenge?.local&&kyotoState.challenge.revision===revision,revision);await dismiss();await page.waitForFunction(()=>kyotoState.ready&&kyotoState.phase==='Aim');const c=await page.evaluate(()=>kyotoState.challenge);courses.push(c);return c;}
try{
 await page.goto(origin+'/level/atrium-welcome');await enter();await page.locator('#game').focus();await page.keyboard.press('h');await context.setOffline(true);let offlineStart=requests.length;
 await design();const first=await capture();assert.equal((await page.evaluate(()=>localData())).courses.length,0);await page.screenshot({path:out+'/review.png'});
 const draft={type:'save-challenge',name:'Offline wall banks',start:first.start,goal:first.goal,waypoints:first.waypoints,scoring:'waypoint-v4',designProof:first.proof};
 for(const [change,pattern] of [[{designProof:'forged'},'Record a design ball'],[{waypoints:first.waypoints.map((w,i)=>i?w:{...w,id:'changed'})},'recorded route changed'],[{editId:'atrium-welcome'},'Only the creator']]){
  await page.evaluate(m=>physicsWorker.postMessage(m),{...draft,...change});await page.waitForFunction(text=>document.getElementById('design-review-status').textContent.includes(text),pattern);assert.equal((await page.evaluate(()=>localData())).courses.length,0);
 }
 const created=await save('Offline wall banks',1);assert.equal(created.creator,await page.evaluate(()=>kyotoState.identityId));assert.equal(created.waypoints.length,first.waypoints.length);
 await page.locator('#game').focus();await page.keyboard.press('h');await throwShot(created.hint.holdMs);await page.waitForFunction(()=>kyotoState.phase==='Result'&&kyotoState.result?.saved&&kyotoState.board.length===1);assert.ok((await page.evaluate(()=>kyotoState.result)).waypointHits.length>0);assert.equal((await page.evaluate(()=>localData())).records[0]?.length,1);
 await design(true);await capture();const revised=await save('Revised offline wall banks',2);assert.equal(revised.id,created.id);assert.deepEqual((await page.evaluate(()=>localData())).records,[[]],'Revising discards retired local scores');
 assert.deepEqual(requests.slice(offlineStart).filter(url=>!new URL(url).pathname.startsWith('/favicon.')),[]);
 await context.setOffline(false);await page.reload();await enter();await page.waitForFunction(id=>kyotoState.challenge?.id===id&&kyotoState.challenge.revision===2,revised.id);assert.equal((await page.evaluate(()=>localData())).courses.length,1);await context.setOffline(true);offlineStart=requests.length;
 await page.setViewportSize({width:390,height:664});await page.waitForFunction(()=>document.body.classList.contains('mobile-ui'));
 await design(true);await capture(async()=>{
  await mobileHold(page,revised.hint.holdMs);
  await page.waitForFunction(()=>kyotoState.phase==='Flight');await page.locator('#mobile-skip').click();
 });await save('Touch-created offline route',3);await page.screenshot({path:out+'/mobile-saved.png'});
 // Cancel and restart real design flights without saving a stale result.
 await design(true);await page.locator('#game').focus();await page.keyboard.press('Space',{delay:200});await page.waitForFunction(()=>kyotoState.phase==='Flight');await page.keyboard.press('r');await page.waitForFunction(()=>kyotoState.phase==='Aim'&&kyotoState.mode==='design');
 await page.keyboard.press('Space',{delay:200});await page.waitForFunction(()=>kyotoState.phase==='Flight');await page.locator('#mobile-levels').click();await page.locator('#design-back').click();await page.waitForFunction(id=>kyotoState.mode==='play'&&kyotoState.phase==='Aim'&&kyotoState.challenge?.id===id,revised.id);await dismiss(false);await page.waitForTimeout(300);
 assert.equal((await page.evaluate(()=>localData())).courses.length,1);assert.deepEqual((await page.evaluate(()=>localData())).records,[[]]);assert.equal(await page.evaluate(()=>kyotoState.pointerLocked),false);assert.deepEqual(requests.slice(offlineStart).filter(url=>!new URL(url).pathname.startsWith('/favicon.')),[]);assert.deepEqual(errors,[]);
 const world=new StaticWorld(decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin')));
 try{for(const c of courses){validateCourse(world,c);const shot=new Shot(world,c,c.solution.launch,c.solution);while(!shot.done&&shot.steps<180*120)shot.step();const r=shot.result();assert.ok(r.success);assert.equal(r.waypointHits.length,c.waypoints.length);assert.equal(r.destinationReached,!!c.goal);assert.ok(shot.ball.sleeping);assert.equal(shot.ball.budgetExhaustions,0);}}finally{world.free();}
 await writeFile(out+'/receipt.json',JSON.stringify({passed:true,engine:testBrowserName,browser:browser.version(),mobileInputKind,courses,errors,offline:true,revision:3},null,2)+'\n');console.log(`PASS ${testBrowserName} offline rendered creator: record, validate, reject forged/changed/foreign revisions, save, play, revise, discard retired scores, reload, mobile-created route (${mobileInputKind}) and cancel/restart design flights; Node reproduces all recorded targets and destinations`);
}catch(error){
 const failure={error:String(error),errors};await writeFile(out+'/failure.json',JSON.stringify(failure,null,2));let deadline;
 try{Object.assign(failure,await Promise.race([page.evaluate(()=>({state:window.kyotoState,messages:window.workerMessages})),new Promise(resolve=>{deadline=setTimeout(()=>resolve({}),2000);})]));}
 catch(captureError){failure.stateError=String(captureError);}finally{clearTimeout(deadline);}
 await writeFile(out+'/failure.json',JSON.stringify(failure,null,2));
 await page.screenshot({path:out+'/failure.png',timeout:5000}).catch(()=>{});throw error;
}
finally{await browser.close();}
