import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Firestore} from '@google-cloud/firestore';
import {chromium} from 'playwright';
import {backgroundInput} from './background-input.mjs';
import {VerificationService} from '../online/service.mjs';
import {verificationHttp} from '../online/http.mjs';
import {HttpError} from '../online/protocol.mjs';
import {verificationCourseKey} from '../verification-checkpoint.mjs';
import {course,header,fixtureWorld,simulate} from './verification-fixture.mjs';
assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^127\.0\.0\.1:\d+$/);assert.equal(process.env.GOOGLE_CLOUD_PROJECT,'demo-kyoto-verification');
const root=resolve('web/public'),site=http.createServer(async(req,res)=>{
 try{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Online score synchronization</title>');return;}
 const file=resolve(root,'.'+req.url);if(!file.startsWith(root+'/'))throw Error('Outside root');res.setHeader('Content-Type','text/javascript');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
});await new Promise(resolve=>site.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${site.address().port}`;
const world=fixtureWorld(),db=new Firestore({projectId:process.env.GOOGLE_CLOUD_PROJECT}),service=new VerificationService({db,namespace:'sync-'+randomUUID(),catalog:[course],world:()=>world,batchLimit:2});
const create=service.create.bind(service),requests=[];let limited=true;
service.create=async(...args)=>{requests.push(Date.now());if(limited){limited=false;throw new HttpError(429,'Retry acceptance',2);}return create(...args);};
const server=verificationHttp(service,{origins:[origin]});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const endpoint=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext();await backgroundInput(context);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
const player={id:randomUUID(),name:'Sync test',named:true},attempt=randomUUID(),baseline=await simulate(world,course,header,[],{attempt,subject:player.id});
try{
 await page.goto(origin);
 await page.evaluate(async({player,course,header,replay,endpoint})=>{
  window.store=await(await import('/local-store.js')).localStore();await store.setting('profile',player);
  const route=crypto.randomUUID();await store.startRoute(route,course);await store.append(replay.attempt,0,{poses:[],contacts:[],scoreFrames:[]});
  const saved={...replay,score:replay.score+1000000000,id:player.id,playerName:player.name,recordingChunks:1,accepted:Date.now(),inputs:{route,chunks:0,header}};await store.finish(saved);await store.save(saved,{endpoint});
  window.syncCatalog=[course];window.config={endpoint,store,getProfile:()=>player,getCatalog:()=>syncCatalog,getSelected:()=>course,changed:(c,result)=>{window.accepted=result||window.accepted;},status:m=>{window.syncStatus=m;}};
  window.makeSync=(await import('/online-scores.js')).onlineScores;
  window.makeSharing=(await import('/online-courses.js')).onlineCourses;
  window.makeBoard=(await import('/result-board.js')).resultBoard;
 },{player,course,header,replay:baseline.result,endpoint});
 await context.setOffline(true);await page.evaluate(()=>{window.sync=makeSync(config);sync.wake();});
 await page.waitForFunction(()=>syncStatus?.phase==='offline');assert.equal((await service.attempts.get()).size,0);
 await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await page.waitForFunction(()=>syncStatus?.detail==='Retry acceptance');
 assert.equal((await page.evaluate(()=>store.pendingSync(config.endpoint))).length,1);
 await page.evaluate(()=>{for(let i=0;i<5;i++)window.dispatchEvent(new Event('online'));});await page.waitForTimeout(500);assert.equal(requests.length,1,'Reconnect events must not bypass Retry-After');
 await page.waitForFunction(()=>window.accepted?.state==='verified',null,{timeout:30000});
 assert.ok(requests[1]-requests[0]>=1900,'The browser waits for the server retry delay before resubmitting');
 assert.equal((await service.attempts.get()).size,1);assert.equal((await service.status(player.id,attempt)).result.score,baseline.result.score);
 const firstToken=await page.evaluate(async endpoint=>await store.setting('online:'+endpoint+':credential'),endpoint);
 await page.evaluate(()=>{sync.stop();sync=makeSync(config);sync.wake();});
 await page.waitForFunction(()=>syncStatus.phase==='connected');
 assert.ok(await page.evaluate(async endpoint=>await store.setting('online:'+endpoint+':credential'),endpoint)===firstToken,'Restart must retain the same credential');assert.equal((await service.players.get()).size,1);
 const progress=await page.evaluate(()=>sync.progress());assert.equal(progress[0].rank,1);
 const extra=Array.from({length:101},()=>({...course,id:randomUUID(),creator:player.id})),batch=db.batch();
 for(const c of extra){batch.set(service.courses.doc(c.id),{published:true,layout:c.layout,physics:c.physics,current:c});batch.set(service.progressRef(player.id,verificationCourseKey(c)),{courseId:c.id,revision:c.revision,courseKey:verificationCourseKey(c),completed:true,best:null});}await batch.commit();
 await page.evaluate(async courses=>{syncCatalog.push(...courses);await sync.refresh();},extra);assert.equal((await page.evaluate(()=>sync.progress())).length,102,'The browser follows all bounded progress pages');
 const remove=db.batch();for(const c of extra){remove.delete(service.courses.doc(c.id));remove.delete(service.progressRef(player.id,verificationCourseKey(c)));}await remove.commit();await page.evaluate(()=>{syncCatalog=[config.getSelected()];});
 await context.setOffline(true);await page.waitForFunction(()=>syncStatus.phase==='offline');assert.equal((await page.evaluate(()=>sync.board(config.getSelected()))).cached,true);
 assert.ok(await page.evaluate(async()=>{
  const board=makeBoard({host:document.body,watch(){},sound:{cue(){}}});
  board.update(config.getSelected(),[],null,{local:false,cached:true,onlineAvailable:true});board.reset();return document.querySelector('#result-leaderboard .eyebrow').textContent.includes('LAST SYNC');
 }),'Resetting a cached board must not relabel it as freshly synchronized');
 assert.deepEqual(errors,[]);console.log('PASS browser synchronization: offline outbox, quota retry delay, complete paginated progress, tampered local score ignored, stable credential, cached rank, offline status and idempotent restart');
 // More than one bounded outbox page must drain on a single reconnect. These
 // are real control proofs against the real HTTP service, not claimed scores.
 const drafts=await page.evaluate(async({course,header,replay,player})=>{
  sync.stop();window.catalog=[course];const base=course;
  let sharing;
  window.sync=makeSync({...config,getCatalog:()=>catalog,synchronize:()=>sharing.sync()});
  sharing=makeSharing({online:sync,store,getProfile:()=>player,getCatalog:()=>catalog,status(){},updated:async()=>{catalog=[base,...(await store.publicCourses(config.endpoint,base)).filter(c=>c.id!==base.id),...await store.courses(base)];}});
  const drafts=[],hit=replay.waypointHits[0];
  for(let i=0;i<21;i++){
   const c={...course,id:crypto.randomUUID(),revision:3,name:'Queued course '+i,creator:player.id,local:true,throwModel:'robot-v4',waypoints:[{id:'bank',center:hit.point,normal:hit.normal,surface:hit.surface,radius:.1}]};
   await store.saveCourse(c);catalog.push(c);const route=crypto.randomUUID(),attempt=crypto.randomUUID();
   await store.startRoute(route,c);await store.append(attempt,0,{poses:[],contacts:[],scoreFrames:[]});
   const saved={...replay,attempt,challenge:c,id:player.id,playerName:player.name,recordingChunks:1,accepted:Date.now(),inputs:{route,chunks:0,header:{...header,courseId:c.id,revision:3}}};
   await store.finish(saved);await store.save(saved);await sharing.queue(c);drafts.push(c);
  }return drafts;
 },{course,header,replay:baseline.result,player});
 assert.equal((await page.evaluate(()=>store.pendingPublications(config.endpoint))).length,20);
 assert.equal((await page.evaluate(()=>store.courses(config.getSelected()))).length,21);
 await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await page.waitForFunction(()=>catalog.filter(c=>c.creator===config.getProfile().id&&!c.local).length===21&&!catalog.some(c=>c.local),null,{timeout:90000});
 assert.equal((await page.evaluate(()=>store.pendingPublications(config.endpoint))).length,0);
 assert.equal((await service.courses.where('published','==',true).get()).size,21);
 assert.ok(await page.evaluate(async c=>(await store.publicationInfo(config.endpoint,c,config.getProfile().id)).published,drafts[0]),'An active old draft remains labelled published after promotion renumbers it');
 assert.ok((await page.evaluate(()=>store.publicCourses(config.endpoint,config.getSelected()))).filter(c=>c.creator===player.id).every(c=>c.revision===1));
 assert.deepEqual(errors,[]);console.log('PASS browser publication outbox: 21 real solutions drain across bounded pages on one reconnect, offline draft revisions become one public revision and promotion removes duplicate drafts');
}catch(error){console.error(JSON.stringify({errors,status:await page.evaluate(()=>window.syncStatus),local:await page.evaluate(async()=>({drafts:(await store.setting('courses'))?.length,pending:(await store.pendingPublications(config.endpoint)).length})),jobs:(await service.attempts.get()).docs.map(d=>({id:d.id,state:d.data().state}))}));throw error;}
finally{await browser.close();server.closeAllConnections();site.closeAllConnections();await Promise.all([new Promise(resolve=>server.close(resolve)),new Promise(resolve=>site.close(resolve))]);await db.recursiveDelete(service.root);await db.terminate();world.free();}
