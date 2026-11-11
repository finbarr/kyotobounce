import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {Firestore} from '@google-cloud/firestore';
import {chromium} from 'playwright';
import {backgroundInput} from './background-input.mjs';
import {VerificationService} from '../online/service.mjs';
import {verificationHttp} from '../online/http.mjs';
import {HttpError} from '../online/protocol.mjs';
import {StaticWorld} from '../public/physics/static-world.js';
import {decodeCollisionPack} from '../public/physics/collision-pack.js';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^127\.0\.0\.1:\d+$/);assert.equal(process.env.GOOGLE_CLOUD_PROJECT,'demo-kyoto-verification');
const origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4430';assert.equal(new URL(origin).hostname,'127.0.0.1');
const catalog=JSON.parse(await readFile('web/starter-challenges.json')).map(c=>({...c,physics:BROWSER_PHYSICS}));
const world=new StaticWorld(decodeCollisionPack(await readFile('.local/browser-physics/station.collision.bin'))),db=new Firestore({projectId:process.env.GOOGLE_CLOUD_PROJECT});
const service=new VerificationService({db,catalog,world:()=>world,namespace:'browser-'+randomUUID(),batchLimit:3}),server=verificationHttp(service,{origins:[origin]});
const replayInputs=service.replayInputs.bind(service),inputRequests=[];let delayReplay=true;
service.replayInputs=async(...args)=>{inputRequests.push(Date.now());if(delayReplay){delayReplay=false;throw new HttpError(429,'Replay controls are busy',1);}return replayInputs(...args);};
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const endpoint=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--enable-webgl','--ignore-gpu-blocklist','--mute-audio']}),errors=[],out='.local/verification/browser';await mkdir(out,{recursive:true});
async function context(){
 const c=await browser.newContext({viewport:{width:1280,height:800}});await backgroundInput(c);
 c.on('page',page=>{page.on('pageerror',e=>{errors.push(String(e));console.error('Browser error: '+String(e));});page.on('console',m=>{if(m.type()==='error')console.error('Browser console: '+m.text());});page.on('websocket',()=>errors.push('Browser opened a gameplay WebSocket'));});
 // Keep the navigation's real loopback response. Fulfilling its HTML through
 // Playwright loses Chrome's address-space classification and trips Local
 // Network Access when the game contacts the separate loopback verifier.
 await c.addInitScript(endpoint=>{
  const install=()=>{if(!document.head)return false;const meta=document.createElement('meta');meta.name='kyoto-verifier';meta.content=endpoint;document.head.append(meta);return true;};
  if(!install()){const observer=new MutationObserver(()=>{if(install())observer.disconnect();});observer.observe(document,{childList:true,subtree:true});}
 },endpoint);return c;
}
async function enter(page,name){
 await page.waitForFunction(()=>document.getElementById('loading-message')?.textContent.includes('Station ready'),null,{timeout:120000});
 const form=page.locator('#loading-name');await form.locator('input').fill(name);await form.locator('button[type=submit]').click();
 await page.waitForFunction(()=>!document.body.classList.contains('is-loading')&&window.kyotoState?.ready,null,{timeout:120000});
 if(await page.locator('#tutorial-hide').isVisible())await page.locator('#tutorial-hide').click();
 if(await page.evaluate(()=>kyotoState.briefing))await page.locator('#briefing-play').click();
 await page.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition);
}
async function select(page,id){
 const c=catalog.find(c=>c.id===id);await page.locator('#game').focus();await page.keyboard.press('l');await page.locator('#campaign-chapter').selectOption(String(c.campaign.chapter));await page.locator(`[data-challenge="${id}"]`).click();
 await page.waitForFunction(id=>kyotoState.challenge?.id===id,id);
 if(await page.evaluate(()=>kyotoState.briefing))await page.locator('#briefing-play').click();
 await page.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition&&kyotoState.phase==='Aim'&&kyotoState.ready);
}
async function throwShot(page,hold){await page.locator('#game').focus();await page.keyboard.press('h');await page.keyboard.press('Space',{delay:hold});await page.waitForFunction(()=>kyotoState.phase==='Flight');}
async function saved(page){return page.evaluate(async()=>{const s=await(await import('/local-store.js')).localStore();try{return await s.records(kyotoState.challenge);}finally{s.close();}});}
async function replayDigest(page,id){return page.evaluate(async id=>{
 const s=await(await import('/local-store.js')).localStore();try{const r=await s.replay(id),bytes=new TextEncoder().encode(JSON.stringify([r.poses,r.contacts]));return {sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join(''),poses:r.poses.length,remote:!!r.remote,proof:!!r.inputs,cacheBytes:r.cacheBytes};}finally{s.close();}
},id);}
async function until(predicate,label){const deadline=Date.now()+90000;while(Date.now()<deadline){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error(label);}
let c,page,second;
try{
 c=await context();page=await c.newPage();await page.goto(origin+'/level/atrium-welcome');await enter(page,'Online acceptance');
 await page.waitForFunction(()=>kyotoState.online?.phase==='connected',null,{timeout:15000});
 await c.setOffline(true);
 await throwShot(page,2250);await page.keyboard.press('Enter');await page.waitForFunction(()=>kyotoState.phase==='Result'&&kyotoState.result);
 const first=await page.evaluate(()=>kyotoState.result);assert.ok(first.success);await until(async()=> (await saved(page)).length===1,'Offline result not saved');
 assert.equal((await service.attempts.get()).size,0,'No unfinished or offline shot was uploaded');
 await select(page,'atrium-clock-in');await throwShot(page,2900);await page.waitForTimeout(600);await page.keyboard.press('r');await page.waitForFunction(()=>kyotoState.phase==='Aim');assert.deepEqual(await saved(page),[]);
 await page.setViewportSize({width:390,height:664});await page.waitForFunction(()=>document.body.classList.contains('mobile-ui'));
 await page.locator('#game').focus();await page.keyboard.press('h');const touch=await c.newCDPSession(page);await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 const box=await page.locator('#mobile-throw').boundingBox();assert.ok(box);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});await page.waitForTimeout(2900);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>kyotoState.phase==='Flight');await page.locator('#mobile-skip').click();await page.waitForFunction(()=>kyotoState.phase==='Result'&&kyotoState.result);
 const mobile=await page.evaluate(()=>kyotoState.result);assert.ok(mobile.success);await until(async()=> (await saved(page)).length===1,'Touch result not saved');
 const pending=await page.evaluate(async endpoint=>{const s=await(await import('/local-store.js')).localStore();try{return await s.pendingSync(endpoint);}finally{s.close();}},endpoint);assert.equal(pending.length,2);
 await page.screenshot({path:out+'/offline-queued.png'});
 console.log('PASS real desktop/touch play offline: two banked proofs queued, computed-but-recalled shot excluded, Skip waits for full physical rest');

 // Reload while the static site works but the verifier is unavailable. The
 // queue and its credential must survive; the game still opens normally.
 const deny=route=>route.abort();await c.route(endpoint+'/**',deny);await c.setOffline(false);await page.reload();await enter(page,'Online acceptance');
 assert.equal((await saved(page)).length,1);assert.equal((await service.attempts.get()).size,0);
 await c.unroute(endpoint+'/**',deny);await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await until(async()=> (await service.attempts.where('state','==','verified').get()).size===2,'Queued controls did not independently verify');
 await page.waitForFunction(()=>document.querySelector('#result-leaderboard')?.dataset.source==='online'&&kyotoState.board.length===1);
 assert.ok(await page.evaluate(()=>{const board=document.querySelector('#result-leaderboard'),row=board.querySelector('li');return row.getBoundingClientRect().bottom<=board.getBoundingClientRect().bottom;}),'The mobile verified row is fully visible below the source switch');
 const board=await page.evaluate(()=>kyotoState.board);assert.equal(board[0].attempt,mobile.attempt);
 const records=(await service.attempts.get()).docs.map(d=>d.data());assert.equal(records.length,2);assert.ok(records.every(r=>r.result.verified&&r.result.success));
 for(const result of [first,mobile])assert.equal(records.find(j=>j.id===result.attempt).score,result.score);
 await page.locator('#score-scope').click();await page.waitForFunction(()=>document.querySelector('#result-leaderboard').dataset.source==='local');
 await page.locator('#score-scope').click();await page.waitForFunction(()=>document.querySelector('#result-leaderboard').dataset.source==='online');
 const original=await replayDigest(page,mobile.attempt);
 await page.locator('#result-leaderboard [data-attempt="'+mobile.attempt+'"] button').click();await page.waitForFunction(()=>kyotoState.mode==='replay',null,{timeout:60000});
 const replacement=await replayDigest(page,mobile.attempt);assert.equal(replacement.sha256,original.sha256);assert.equal(replacement.poses,original.poses);assert.ok(replacement.remote&&replacement.proof);assert.ok(replacement.cacheBytes>0,'The worker accounts for downloaded replay bytes');
 assert.ok(inputRequests.length>=2&&inputRequests[1]-inputRequests[0]>=900,'The replay worker respects the server retry delay and resumes the same input chunk');
 await page.locator('#close-replay').click();
 await page.screenshot({path:out+'/online-verified.png'});
 await page.reload();await enter(page,'Online acceptance');await page.waitForFunction(()=>document.querySelector('#result-leaderboard').dataset.source==='online');
 assert.equal((await service.players.get()).size,1,'Reload retains the same authenticated player');assert.equal((await service.attempts.get()).size,2,'Retries never duplicate ranked shots');
 console.log('PASS reconnect/reload: durable queue, same identity, independent scores, authoritative board, local/online switch and no duplicate attempts');
 await c.close();c=null;

 // A different player has no local replay. Build it from public verified
 // controls in the existing physics worker, then replay it after disconnection.
 second=await context();page=await second.newPage();await page.goto(origin+'/level/atrium-welcome');await enter(page,'Replay viewer');
 await page.waitForFunction(()=>document.querySelector('#result-leaderboard').dataset.source==='online'&&kyotoState.board.length===1);
 await page.locator('#result-leaderboard [data-attempt="'+first.attempt+'"] button').click();await page.waitForFunction(()=>kyotoState.mode==='replay',null,{timeout:60000});
 const imported=await page.evaluate(async id=>{const s=await(await import('/local-store.js')).localStore();try{return await s.replay(id);}finally{s.close();}},first.attempt);
 assert.ok(imported.remote&&imported.verified&&!imported.local);assert.equal(imported.score,first.score);assert.ok(imported.poses.length>1000);
 await page.screenshot({path:out+'/public-replay.png'});
 await page.locator('#close-replay').click();await second.setOffline(true);await page.locator('#result-leaderboard [data-attempt="'+first.attempt+'"] button').click();await page.waitForFunction(()=>kyotoState.mode==='replay');
 assert.equal(await page.evaluate(()=>kyotoState.pointerLocked),false);
 await second.close();second=await context();page=await second.newPage();await page.goto(origin+'/replay/'+first.attempt);
 await page.waitForFunction(()=>!document.body.classList.contains('is-loading')&&window.kyotoState?.mode==='replay',null,{timeout:120000});
 assert.equal(await page.locator('#player-name-dialog').evaluate(e=>e.open),false);assert.equal((await service.players.get()).size,2,'An anonymous replay link does not create a player or require a name');
 await page.waitForFunction(()=>document.querySelector('#result-leaderboard').dataset.source==='online'&&document.querySelector('#result-leaderboard li'));
 await page.screenshot({path:out+'/anonymous-replay.png'});
 await writeFile(out+'/receipt.json',JSON.stringify({physics:BROWSER_PHYSICS,layout:world.layoutSha256,attempts:records.map(j=>({attempt:j.id,score:j.score,success:j.result.success})),publicReplay:{score:imported.score,poses:imported.poses.length,contacts:imported.contacts.length},errors},null,2)+'\n');
 assert.deepEqual(errors,[]);console.log('PASS another player’s public replay: worker reconstruction, local cache, offline viewing and no desktop pointer capture');
}catch(error){
 console.error(JSON.stringify({errors,jobs:(await service.attempts.get()).docs.map(d=>({id:d.id,state:d.data().state,steps:d.data().walkingSteps,shotSteps:d.data().shotSteps})),screen:await page?.evaluate(()=>({loading:document.getElementById('loading-message')?.textContent,connection:document.getElementById('connection')?.textContent,phase:window.kyotoState?.phase,online:window.kyotoState?.online})).catch(()=>null)}));
 await page?.screenshot({path:out+'/failure.png',timeout:5000}).catch(()=>{});throw error;
}finally{
 await c?.close();await second?.close();await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await db.recursiveDelete(service.root);await db.terminate();world.free();
}
