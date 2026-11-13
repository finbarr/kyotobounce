import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {backgroundInput} from './background-input.mjs';
import {onlineBackend} from './online-backend.mjs';
import {BROWSER_PHYSICS} from '../public/physics/shot.js';
let origin=process.env.KYOTO_TEST_ORIGIN||'http://127.0.0.1:4430';assert.equal(new URL(origin).hostname,'127.0.0.1');
const catalog=JSON.parse(await readFile('web/starter-challenges.json')).map(c=>({...c,physics:BROWSER_PHYSICS}));
const backend=await onlineBackend({site:process.argv.includes('--sites'),d1:process.argv.includes('--d1'),origin,catalog}),endpoint=backend.endpoint;
if(backend.kind==='sites')origin=endpoint;
const out='.local/verification/course-sharing-'+backend.kind;await mkdir(out,{recursive:true});await writeFile(out+'/receipt.json',JSON.stringify({passed:false,backend:backend.kind})+'\n');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal','--enable-webgl','--ignore-gpu-blocklist','--mute-audio']}),errors=[];
async function context(){
 const c=await browser.newContext({viewport:{width:1280,height:800}});await backgroundInput(c);
 c.on('page',p=>{p.on('pageerror',e=>errors.push(String(e)));p.on('websocket',()=>errors.push('Unexpected gameplay WebSocket'));});
 await c.addInitScript(({endpoint,inject})=>{
  const install=()=>{if(!document.head)return false;const meta=document.createElement('meta');meta.name='kyoto-verifier';meta.content=endpoint;document.head.append(meta);return true;};
  if(inject&&!install()){const observer=new MutationObserver(()=>{if(install())observer.disconnect();});observer.observe(document,{childList:true,subtree:true});}
  window.readLocal=async()=>{const s=await(await import('/local-store.js')).localStore();try{return {courses:await s.setting('courses')||[],publications:await s.pendingPublications(endpoint),public:await s.publicCourses(endpoint,kyotoState.challenge)};}finally{s.close();}};
 },{endpoint,inject:backend.kind!=='sites'});return c;
}
async function dismiss(p){if(await p.locator('#tutorial-hide').isVisible())await p.locator('#tutorial-hide').click();if(await p.evaluate(()=>kyotoState.briefing))await p.locator('#briefing-play').click();await p.waitForFunction(()=>!kyotoState.briefing&&!kyotoState.briefingTransition);}
async function enter(p,name){await p.waitForFunction(()=>document.getElementById('loading-message')?.textContent.includes('Station ready'),null,{timeout:120000});await p.locator('#loading-name input').fill(name);await p.locator('#loading-name button[type=submit]').click();await p.waitForFunction(()=>!document.body.classList.contains('is-loading')&&window.kyotoState?.ready,null,{timeout:120000});await dismiss(p);}
async function throwShot(p,hold){await p.locator('#game').focus();await p.keyboard.press('h');await p.keyboard.press('Space',{delay:hold>=2800?Math.max(hold,2900):hold});await p.waitForFunction(()=>kyotoState.phase==='Flight');await p.keyboard.press('Enter');}
async function design(p,edit,name,revision){
 await p.locator('#game').focus();await p.keyboard.press('l');await p.locator(edit?'#edit-challenge':'#new-challenge').click();await p.waitForFunction(()=>kyotoState.mode==='design'&&kyotoState.phase==='Aim');
 // This suite verifies publication and revision workflows. A saturated real
 // hold reproduces the same launch despite browser event-delivery jitter;
 // a partial hold can legitimately miss its own narrowly generated targets.
 await throwShot(p,2900);await p.waitForFunction(()=>kyotoState.mode==='editor');await p.locator('#challenge-name').fill(name);await p.locator('#save-challenge').click();
 await p.waitForFunction(revision=>kyotoState.mode==='play'&&kyotoState.challenge?.local&&kyotoState.challenge.revision===revision,revision);await dismiss(p);return p.evaluate(()=>kyotoState.challenge);
}
async function clear(p,c){
 await throwShot(p,c.hint.holdMs);await p.waitForFunction(()=>kyotoState.phase==='Result'&&kyotoState.result);
 const r=await p.evaluate(()=>kyotoState.result);assert.ok(r.success&&r.destinationReached,'Real controller throw must clear every target and finish');assert.equal(r.waypointHits.length,c.waypoints.length);
 await p.waitForFunction(()=>!document.getElementById('publish-result').disabled);return r;
}
async function adopt(p,id){await p.locator('#game').focus();await p.keyboard.press('l');await p.locator('#campaign-chapter').selectOption('community');await p.locator('[data-challenge="'+id+'"]').click();await p.waitForFunction(id=>kyotoState.challenge?.id===id&&kyotoState.challenge.revision===2,id);await dismiss(p);}
async function until(fn,label){const end=Date.now()+90000;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error(label);}
let owner,visitor,page,other;
try{
 owner=await context();page=await owner.newPage();await page.goto(origin+'/level/atrium-welcome');await enter(page,'Publishing author');await page.waitForFunction(()=>kyotoState.online?.phase==='connected');
 await owner.setOffline(true);const created=await design(page,false,'Shared station banks',1);
 await page.locator('#game').focus();await page.keyboard.press('l');assert.ok(await page.locator('#publish-challenge').isDisabled());await page.locator('#close-levels').click();
 const result=await clear(page,created);await page.locator('#publish-result').click();
 await until(()=>page.evaluate(async()=>(await readLocal()).publications.length===1),'Offline publication was not saved');assert.equal((await backend.records()).length,0);
 assert.ok(await page.evaluate(async()=>{const s=await(await import('/local-store.js')).localStore();try{await s.saveCourse({...kyotoState.challenge,revision:2});return false;}catch(e){return e.message.includes('finish publishing');}finally{s.close();}}),'A second database connection cannot replace a queued course');
 await page.locator('#game').focus();await page.keyboard.press('l');assert.ok(await page.locator('#edit-challenge').isDisabled());
 assert.match(await page.locator('#publication-status').textContent(),/queued|Reconnect/i);await page.locator('#publication-status').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/queued.png'});
 const deny=route=>route.abort();await owner.route(endpoint+'/v1/**',deny);await owner.setOffline(false);await page.reload();await enter(page,'Publishing author');
 assert.equal((await page.evaluate(()=>readLocal())).publications.length,1);
 await owner.unroute(endpoint+'/v1/**',deny);await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await until(async()=> (await backend.course(created.id))?.published,'Queued course did not publish');
 await page.waitForFunction(()=>!kyotoState.challenge.local);await until(()=>page.evaluate(async()=>(await readLocal()).publications.length===0),'Published course remained queued');
 await until(async()=> (await backend.records()).filter(j=>j.state==='verified').length===1,'Published-course proof play did not independently rank');
 const published=(await backend.course(created.id));assert.equal(published.current.creator,created.creator);assert.equal(published.revision,1);
 assert.equal((await page.evaluate(()=>readLocal())).courses.length,0,'Promotion removes the private copy');
 await page.locator('#game').focus();await page.keyboard.press('l');assert.ok(await page.locator('#share-challenge').isVisible());assert.ok(await page.locator('#publish-challenge').isHidden());await page.locator('#publication-status').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/published.png'});await page.locator('#close-levels').click();
 console.log('PASS rendered creator publication: clear requirement, offline durable queue, edit fencing, reload/reconnect, verified public course and independently ranked controls');

 visitor=await context();other=await visitor.newPage();await other.goto(origin+'/level/'+created.id);await enter(other,'Visiting player');
 await other.waitForFunction(id=>kyotoState.challenge?.id===id&&!kyotoState.challenge.local,created.id);await dismiss(other);
 await other.locator('#game').focus();await other.keyboard.press('l');assert.ok(await other.locator('#edit-challenge').isHidden());assert.ok(await other.locator('#publish-challenge').isHidden());await other.locator('#close-levels').click();
 await other.waitForFunction(()=>document.querySelector('#result-leaderboard')?.dataset.source==='online'&&kyotoState.board.length===1);
 await other.locator('#result-leaderboard [data-attempt="'+result.attempt+'"] button').click();await other.waitForFunction(()=>kyotoState.mode==='replay',null,{timeout:60000});await other.locator('#close-replay').click();
 await visitor.setOffline(true);await other.setViewportSize({width:390,height:664});await other.waitForFunction(()=>document.body.classList.contains('mobile-ui'));
 await throwShot(other,created.hint.holdMs);await other.waitForFunction(()=>kyotoState.phase==='Result'&&kyotoState.result);assert.ok((await other.evaluate(()=>kyotoState.result)).waypointHits.length>0);
 await other.screenshot({path:out+'/visitor-offline.png'});
 console.log('PASS fresh-device shared link, creator-only controls, public custom-course replay and cached offline mobile play');

 // Several offline edits become one next public revision. Local draft numbers
 // are discarded on promotion instead of migrating retired scores.
 await owner.setOffline(true);await design(page,true,'Second draft',2);const revised=await design(page,true,'Published revision two',3);await page.setViewportSize({width:390,height:664});await clear(page,revised);await page.locator('#publish-result').click();await page.screenshot({path:out+'/mobile-publication.png'});
 await until(()=>page.evaluate(async()=>(await readLocal()).publications.length===1),'Revised publication was not saved');await owner.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await until(async()=> (await backend.course(created.id))?.revision===2,'Revised course did not publish');
 await until(()=>page.evaluate(async()=>(await readLocal()).public.some(c=>c.id===kyotoState.challenge.id&&c.revision===2)),'Published revision was not cached');
 await adopt(page,created.id);await page.waitForFunction(()=>kyotoState.challenge.revision===2&&!kyotoState.challenge.local);
 assert.equal((await page.evaluate(()=>readLocal())).courses.length,0);assert.equal((await backend.course(created.id)).current.name,'Published revision two');
 await other.locator('#game').focus();await other.keyboard.press('r');await other.waitForFunction(()=>kyotoState.phase==='Aim');await other.keyboard.press('h');await other.keyboard.press('Space',{delay:2250});await other.waitForFunction(()=>kyotoState.phase==='Flight');
 const release=await other.evaluate(()=>kyotoState.releaseTime);
 await visitor.setOffline(false);await other.evaluate(()=>window.dispatchEvent(new Event('online')));await until(()=>other.evaluate(async()=>(await readLocal()).public.some(c=>c.id===kyotoState.challenge.id&&c.revision===2)),'Visitor did not cache the updated course during flight');
 assert.equal(await other.evaluate(()=>kyotoState.phase),'Flight');assert.equal(await other.evaluate(()=>kyotoState.releaseTime),release);assert.equal(await other.evaluate(()=>kyotoState.challenge.revision),1);
 await other.keyboard.press('r');await other.waitForFunction(()=>kyotoState.phase==='Aim');
 // The active old result is not rewritten under the new targets. Selection adopts
 // the current revision deliberately, without interrupting an in-flight ball.
 assert.equal(await other.evaluate(()=>kyotoState.challenge.revision),1);await adopt(other,created.id);await other.waitForFunction(()=>kyotoState.challenge.revision===2);
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>kyotoState.pointerLocked),false);assert.equal(await other.evaluate(()=>kyotoState.pointerLocked),false);
 await writeFile(out+'/receipt.json',JSON.stringify({passed:true,backend:backend.kind,course:created.id,revision:2,author:created.creator,publication:published.solution,errors},null,2)+'\n');
 console.log('PASS offline multi-edit revision publication, atomic local promotion, current public catalog and deliberate adoption of updated course geometry');
}catch(error){for(const [name,p]of [['owner',page],['visitor',other]])if(p){await p.screenshot({path:out+'/'+name+'-failure.png'}).catch(()=>{});await writeFile(out+'/'+name+'-failure.json',JSON.stringify({error:String(error),errors,state:await p.evaluate(()=>window.kyotoState),local:await p.evaluate(()=>window.kyotoState?.challenge?readLocal():null)},null,2));}throw error;}
finally{await browser.close();await backend.close();}
